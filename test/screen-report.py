#!/usr/bin/env python3
"""Report of every screen XML under screen/ and the testing that reaches it, as Markdown.

Usage (from the MR-Moqui root, after `cargo build -p moqui`):
  python3 runtime/component/MrSimpleScreens/test/screen-report.py [--out FILE] [--paths FILE] [--no-run]

Columns: Discovery (one of the no-required-parameter paths SimpleScreensRender renders), Targeted (the path appears in
the JS specs; a text match, so it can over-credit a screen named inside a longer path), Smoke (in browser-smoke.mjs),
Companion files (the .fancy replacements and original .ftl beside the screen).

The discovery list comes from the runner (screens.getNoRequiredParameterPaths); this writes a throwaway spec to get it
and removes the spec again. --paths FILE reads a saved list (one path per line) and --no-run skips the runner (then
Discovery is blank). The report is for the agent or reviewer; MIGRATION-STATUS.md keeps only the Migrated/Validated
checklist, which a person or agent ticks by hand.
"""
import argparse, os, re, subprocess, sys

here = os.path.dirname(os.path.abspath(__file__))
comp = os.path.dirname(here)
root = os.path.abspath(os.path.join(comp, '..', '..', '..'))
SKIP = ['wiki', 'ViewWikiPage', 'EditWikiPage', 'WikiCommentNested', 'WikiCommentReply', 'SalesSummary']  # as SimpleScreensRender

def discovery_paths():
    spec = os.path.join(here, 'TmpPaths.spec.js')
    open(spec, 'w').write('''let screens
spec({ setupSpec() { login("john.doe"); screens = ec.screen.makeTest().rootScreen("component://SimpleScreens/screen/SimpleScreens.xml") } })
feature("dump", { expect() {
    const paths = screens.getNoRequiredParameterPaths(%s)
    log.warn("PATHDUMP\\n" + paths.join("\\n") + "\\nPATHDUMPEND")
    paths.length > 0
} })
''' % repr(SKIP).replace("'", '"'))
    try:
        out = subprocess.run([os.path.join(root, 'target/debug/moqui'), 'test', 'SimpleScreens', '--spec', 'TmpPaths'],
                             cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True).stdout
    finally:
        os.remove(spec)
    m = re.search(r'PATHDUMP\n(.*?)PATHDUMPEND', out, re.S)
    if not m: sys.exit('could not get the discovery paths from the runner:\n' + out[-2000:])
    return {re.sub(r'^[\s|]*', '', l).strip() for l in m.group(1).splitlines() if l.strip(' |')}

ap = argparse.ArgumentParser()
ap.add_argument('--out'); ap.add_argument('--paths'); ap.add_argument('--no-run', action='store_true')
a = ap.parse_args()
disc = set(open(a.paths).read().split()) if a.paths else (set() if a.no_run else discovery_paths())

files = sorted(subprocess.check_output(['git', 'ls-files', 'screen'], cwd=comp, text=True).split())
spec = ''.join(open(os.path.join(here, n)).read() for n in sorted(os.listdir(here)) if n.endswith('.spec.js'))
smoke = open(os.path.join(here, 'browser-smoke.mjs')).read()
rows = []
for f in sorted((x for x in files if x.endswith('.xml')), key=lambda x: x[7:-4].lower()):
    p = f[7:-4]
    q = p[len('SimpleScreens/'):] if p.startswith('SimpleScreens/') else p
    name = p.split('/')[-1]
    d = 'yes' if q in disc else ('excluded' if name in SKIP else '')
    t = 'yes' if re.search(r'(?<![A-Za-z0-9/])' + re.escape(q) + r'(?![A-Za-z0-9])', spec) else ''
    b = 'yes' if re.search(r'apps/SimpleScreens/' + re.escape(q) + r'(?![A-Za-z0-9])', smoke) else ''
    n = ', '.join(sorted({x.split('.', 1)[1] for x in files if x.startswith(f[:-4] + '.') and not x.endswith('.xml')}))
    rows.append((p, d, t, b, n))
out = ['# MrSimpleScreens screen report', '',
       f'{len(rows)} screens; discovery {sum(1 for r in rows if r[1] == "yes")}, targeted {sum(1 for r in rows if r[2])}, '
       f'either {sum(1 for r in rows if r[1] == "yes" or r[2])}, smoke {sum(1 for r in rows if r[3])}.', '',
       '| Screen | Discovery | Targeted | Smoke | Companion files |', '| --- | :-: | :-: | :-: | --- |']
out += [f'| `{p}` | {d} | {t} | {b} | {n} |' for p, d, t, b, n in rows]
text = '\n'.join(out) + '\n'
if a.out: open(a.out, 'w').write(text); print('wrote', a.out, out[2])
else: sys.stdout.write(text)
