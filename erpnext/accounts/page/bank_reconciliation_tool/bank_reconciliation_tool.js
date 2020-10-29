frappe.provide("erpnext.accounts");

frappe.pages['bank-reconciliation-tool'].on_page_load = function(wrapper) {
	new erpnext.accounts.bankReconciliationTool(wrapper);
}


erpnext.accounts.bankReconciliationTool = class BankReconciliationTool {
	constructor(wrapper) {
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Bank Reconciliation Tool"),
			single_column: true
		});
		this.parent = wrapper;
		this.page = this.parent.page;

		// this.check_plaid_status();
		this.make_form();
	}

	make_form() {
		this.form = new frappe.ui.FieldGroup({
			fields: [
				{
					fieldname: 'statement_or_manual',
					fieldtype: 'Select',
					options:  'Choose a Statement\nEnter Details Manually',
					default: 'Choose a Statement'
					
				},
				{
					fieldtype: 'Column Break',
				},
				{
					fieldtype: 'Link',
					fieldname: 'company',
					label: __('Company'),
					options: 'Company',
				},
				{
					fieldtype: 'Column Break',
				},
				{
					fieldtype: 'Link',
					fieldname: 'bank_account',
					label: __('Bank Account'),
					options: 'Bank Account'
				},
				{
					fieldtype: 'Section Break',
					label: __('Choose a Statement'),
					depends_on: "eval:doc.statement_or_manual=='Choose a Statement'"
				},
				{
					fieldname: 'bank_statement',
					fieldtype: 'Link',
					options: 'Bank Statement'
				},
				{
					fieldtype: 'Section Break',
					label: __('Reconcile'),
				},
				{
					fieldname: 'transactions',
					fieldtype: 'HTML',
					options: `<div id = 'transactions'></div>`
				},

				{
					fieldtype: 'HTML',
					fieldname: 'preview'
				}
			],
			body: this.page.body
		});
		this.form.set_query("bank_account", function () {
			return {
				"filters": {
					"company": frm.doc.company,	
				}
			};
		});
		this.form.make();
	}

	// make() {
	// 	const me = this;

	// 	me.$main_section = $(`<div class="reconciliation page-main-content"></div>`).appendTo(me.page.main);
	// 	const empty_state = __("Upload a bank statement, link or reconcile a bank account")
	// 	me.$main_section.append(`<div class="flex">
	// 	<div class="form-layout">
		
	// 	<div class="form-page">
		
	// 	<div class="row form-section card-section empty-section">
		
	// 	<div class="row form-section card-section empty-section">
		
	// 	<div class="section-body">
		
		
	// 	<div class="form-column col-sm-12">
		


	// 	</div>

	// 	</div>
		
	// 	</div>
		
	// 	</div>
		
	// 	</div>

	// 	</div>
		
	// 	</div>`)

	// 	me.main_selector = frappe.ui.form.make_control({
	// 		df: {
    //             fieldtype: 'Select',
	// 			options: `Choose a Statement\nEnter Details Manually`,
    //             // onchange: function() {
    //             //     me.refresh_list(me.search_field.get_value(), this.value);
    //             // }
	// 		},
    //         parent: this.$main_section.find('.form-column'),
	// 		render_input: true,
    //     });

	// 	// me.page.add_field({
	// 	// 	fieldtype: 'Link',
	// 	// 	label: __('Company'),
	// 	// 	fieldname: 'company',
	// 	// 	options: "Company",
	// 	// 	onchange: function() {
	// 	// 		if (this.value) {
	// 	// 			me.company = this.value;
	// 	// 		} else {
	// 	// 			me.company = null;
	// 	// 			me.bank_account = null;
	// 	// 		}
	// 	// 	}
	// 	// })
	// // 	me.page.add_field({
	// // 		fieldtype: 'Link',
	// // 		label: __('Bank Account'),
	// // 		fieldname: 'bank_account',
	// // 		options: "Bank Account",
	// // 		get_query: function() {
	// // 			if(!me.company) {
	// // 				frappe.throw(__("Please select company first"));
	// // 				return
	// // 			}

	// // 			return {
	// // 				filters: {
	// // 					"company": me.company
	// // 				}
	// // 			}
	// // 		},
	// // 		onchange: function() {
	// // 			if (this.value) {
	// // 				me.bank_account = this.value;
	// // 				me.add_actions();
	// // 			} else {
	// // 				me.bank_account = null;
	// // 				me.page.hide_actions_menu();
	// // 			}
	// // 		}
	// // 	})
	// }

}