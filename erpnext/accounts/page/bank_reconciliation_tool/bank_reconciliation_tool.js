frappe.provide("erpnext.accounts");
frappe.provide("frappe.widget.utils");
frappe.provide("frappe");

frappe.pages["bank-reconciliation-tool"].on_page_load = function (wrapper) {
	console.log(wrapper);
	frappe.require("assets/js/bank-reconciliation-tool.min.js", function () {
		console.log(erpnext.accounts.BankReconciliationController);
		new erpnext.accounts.BankReconciliationController(wrapper);
	});
};
