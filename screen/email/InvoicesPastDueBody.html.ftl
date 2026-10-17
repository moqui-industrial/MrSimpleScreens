<#assign dateFormat = dateFormat ?? "dd MMM yyyy">

<p>The following invoices are now past due and we have not received payment for the unpaid amounts listed below.</p>

<p>Please contact us immediately to discuss payment options.</p>

<p><strong>Past Due Invoices</strong></p>
<table border="0" cellpadding="8px" cellspacing="3" width="100%">
    <tr><td>Your Order</td><td>Ref #</td><td>Invoice #</td><td>Date</td><td>Due</td><td>Total</td><td>Unpaid</td></tr>
    <#list invoiceList as invoice>
        <tr>
            <td>${WebUtilities.encodeHtml(invoice.otherPartyOrderId ?? "")}</td>
            <td>${WebUtilities.encodeHtml(invoice.referenceNumber ?? "")}</td>
            <td>${WebUtilities.encodeHtml(invoice.invoiceId)}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.format(invoice.invoiceDate ?? null, dateFormat))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.format(invoice.dueDate ?? null, dateFormat))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.formatCurrency(invoice.invoiceTotal ?? 0, invoice.currencyUomId ?? "USD"))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.formatCurrency(invoice.unpaidTotal ?? 0, invoice.currencyUomId ?? "USD"))}</td>
        </tr>
    </#list>
</table>

<#if (paymentList?.length > 0)>
<p><strong>Payments not yet Applied</strong></p>
<table border="0" cellpadding="8px" cellspacing="3" width="100%">
    <tr><td>Payment Ref #</td><td>Payment #</td><td>Date</td><td>Total</td><td>Unapplied</td></tr>
    <#list paymentList as payment>
        <tr>
            <td>${WebUtilities.encodeHtml(payment.paymentRefNum ?? "")}</td>
            <td>${WebUtilities.encodeHtml(payment.paymentId)}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.format(payment.effectiveDate ?? null, dateFormat))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.formatCurrency(payment.amount ?? 0, payment.amountUomId ?? "USD"))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.formatCurrency(payment.unappliedTotal ?? 0, payment.amountUomId ?? "USD"))}</td>
        </tr>
    </#list>
</table>
</#if>

<#if (creditInvoiceList?.length > 0)>
<p><strong>Credit Memos not yet Applied</strong></p>
<table border="0" cellpadding="8px" cellspacing="3" width="100%">
    <tr><td>Your Order</td><td>Credit Ref #</td><td>Memo #</td><td>Date</td><td>Due</td><td>Total</td><td>Unapplied</td></tr>
    <#list creditInvoiceList as invoice>
        <tr>
            <td>${WebUtilities.encodeHtml(invoice.otherPartyOrderId ?? "")}</td>
            <td>${WebUtilities.encodeHtml(invoice.referenceNumber ?? "")}</td>
            <td>${WebUtilities.encodeHtml(invoice.invoiceId)}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.format(invoice.invoiceDate ?? null, dateFormat))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.format(invoice.dueDate ?? null, dateFormat))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.formatCurrency(invoice.invoiceTotal ?? 0, invoice.currencyUomId ?? "USD"))}</td>
            <td>${WebUtilities.encodeHtml(ec.l10n.formatCurrency(invoice.unpaidTotal ?? 0, invoice.currencyUomId ?? "USD"))}</td>
        </tr>
    </#list>
</table>
</#if>

<p><strong>Total Past Due</strong> ${WebUtilities.encodeHtml(ec.l10n.format(toDecimal(unpaidInvoiceTotal ?? 0).subtract(unappliedPaymentTotal ?? 0).subtract(creditInvoiceTotal ?? 0), "#,##0.00"))}</p>

<p><strong>Customer #</strong> ${WebUtilities.encodeHtml(toParty.pseudoId)}</p>
