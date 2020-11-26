frappe.provide("erpnext.accounts");
frappe.provide("frappe.widget.utils");
frappe.provide("frappe");

frappe.pages["bank-reconciliation-tool"].on_page_load = function (wrapper) {
	frappe.require("assets/js/bank-reconciliation-tool.min.js", function () {
		new erpnext.accounts.BankReconciliationController(wrapper);
	});
};
