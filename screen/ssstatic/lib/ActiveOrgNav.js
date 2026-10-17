define({
    /* CC0. Native organization menu for the supported Vue runtime. */
    data: function() { return { activeOrg:null, userOrgList:[] } },
    template:
        '<details id="active-org-menu"><summary title="Organization"><i class="fa fa-globe"></i> {{activeOrg ? activeOrg.pseudoId : "Organization"}}</summary>' +
            '<ul><li v-if="activeOrg"><button type="button" @click="updateActive(null)">Clear Active Organization</button></li>' +
            '<li v-for="userOrg in userOrgList" :key="userOrg.partyId"><button type="button" @click="updateActive(userOrg.partyId)">{{userOrg.pseudoId}}: {{userOrg.organizationName}}</button></li></ul>' +
        '</details>',
    methods: {
        updateActive: function(partyId) {
            return moqui.request(this.$root.appRootPath + '/apps/setPreference', {
                method:'POST', params:{preferenceKey:'ACTIVE_ORGANIZATION', preferenceValue:partyId || ''}
            }).then(() => {
                this.activeOrg = this.userOrgList.find(org => org.partyId === partyId) || null;
                this.$root.reloadSubscreens();
            }).catch(error => { console.error('Set active organization', error); this.$root.addNotify('Could not update active organization', 'danger'); });
        }
    },
    mounted: function() {
        moqui.request(this.$root.appRootPath + '/rest/s1/mantle/my/userOrgInfo').then(result => {
            if (!result.json) throw new Error('Invalid organization response');
            this.activeOrg = result.json.activeOrg;
            this.userOrgList = result.json.userOrgList || [];
        }).catch(error => { console.error('Load user organizations', error); this.$root.addNotify('Could not load organizations', 'danger'); });
    }
});
