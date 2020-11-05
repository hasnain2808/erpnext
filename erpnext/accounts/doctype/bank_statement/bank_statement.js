// Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and contributors
// For license information, please see license.txt

frappe.ui.form.on('Bank Statement', {
	// refresh: function(frm) {

	// }
	company: function(frm){
		set_bank_account_filter(frm)
	},
	bank: function(frm) {
		set_bank_account_filter(frm)
	}
});

function set_bank_account_filter(frm){
	frm.set_query("bank_account", function () {
		return {
			"filters": {
				"company": frm.doc.company ,
				"bank": frm.doc.bank
			}
		};
	});
}
