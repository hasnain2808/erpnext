{% include "erpnext/accounts/page/bank_reconciliation_tool/upload_statement.js" %};
{% include "erpnext/accounts/page/bank_reconciliation_tool/reconciliation_row.js" %};
{% include "erpnext/accounts/page/bank_reconciliation_tool/import_preview_dialog.js" %};

frappe.provide("erpnext.accounts");
frappe.provide('frappe.widget.utils');

frappe.pages["bank-reconciliation-tool"].on_page_load = function (wrapper) {
	new erpnext.accounts.bankReconciliationTool(wrapper);
};

erpnext.accounts.bankReconciliationTool = class BankReconciliationTool {
	constructor(wrapper) {
		this.page = frappe.ui.make_app_page({
			parent: wrapper,
			title: __("Bank Reconciliation Tool"),
			single_column: true,
		});
		this.upload_statement_button = this.page.set_secondary_action(__("Upload a Statement"), ()=>{
			this.upload_statement_dialog_object.upload_statement_dialog.show()
			if (!this.upload_statement_dialog_object.upload_statement_dialog.get_value("data_import_id")) {
				this.upload_statement_dialog_object.upload_statement_dialog.get_primary_btn().hide()
			}
		})

		this.parent = wrapper;
		this.page = this.parent.page;
		this.upload_statement_dialog_object = new erpnext.accounts.UploadStatememt();
		this.make_form();
		this.$result = $("#transactions");
		this.$cards = $("#cards");

	}


	make_form() {
		const me = this;
		me.form = new frappe.ui.FieldGroup({
			fields: [
				{
					fieldtype: "Link",
					fieldname: "company",
					label: __("Company"),
					options: "Company",
					change: () => {
						this.make_reconciliation_tool()

					},
				},
				{
					fieldtype: "Link",
					fieldname: "bank_account",
					label: __("Bank Account"),
					options: "Bank Account",
					get_query: () => {
						return {
							filters: {
								company: [
									"in",
									[me.form.get_value("company") || ""],
								],
							},
						};
					},
					change: () => {
						me.form.refresh_dependency()

						me.bank_account =
						me.form.get_value("bank_account") || "";
						this.get_account_opening_balance()
						this.make_reconciliation_tool()
					},
				},

				{
					fieldtype: "Column Break",
				},
				{
					fieldname: "bank_statement_from_date",
					label: __("Bank Statement From Date"),
					fieldtype: "Date",
					depends_on: "eval: doc.bank_account",
					change: () => {
						me.form.refresh_dependency()
						if (me.bank_statement_from_date != me.form.get_value("bank_statement_from_date")) {
							me.bank_statement_from_date =
								me.form.get_value(
									"bank_statement_from_date"
								) || "";
								this.get_account_opening_balance()
								this.make_reconciliation_tool()

							}
					},
				},
				{
					fieldname: "bank_statement_to_date",
					label: __("Bank Statement To Date"),
					fieldtype: "Date",
					depends_on: "eval: doc.bank_statement_from_date",
					change: () => {
						me.form.refresh_dependency()
						if (me.bank_statement_to_date != me.form.get_value("bank_statement_to_date")) {
							me.bank_statement_to_date =
								me.form.get_value(
									"bank_statement_to_date"
								) || "";
							this.make_reconciliation_tool()

						}
					},
				},
				{
					fieldtype: "Column Break",
				},
				{
					fieldname: "account_opening_balance",
					label: __("Account Opening Balance"),
					fieldtype: "Currency",
					options: "Currency",
					depends_on: "eval: doc.bank_statement_from_date",
					read_only: 1,
				},
				{
					fieldname: "bank_statement_closing_balance",
					label: __("Bank Statement Closing Balance"),
					fieldtype: "Currency",
					options: "Currency",
					depends_on: "eval: doc.bank_statement_to_date",

					change: () => {
						if (me.bank_statement_closing_balance != me.form.get_value("bank_statement_closing_balance")) {

							me.bank_statement_closing_balance =
								me.form.get_value(
									"bank_statement_closing_balance"
								) || "";
								this.make_reconciliation_tool()
						}

					},
				},
				{
					fieldtype: "Section Break",
					fieldname: "section_break_1",
					label: __("Reconcile"),
					depends_on: "eval: doc.bank_statement_closing_balance",

				},
				{
					fieldname: "transactions",
					fieldtype: "HTML",
					options: `<div id = "cards"></div>`,
				},
				{
					fieldname: "transactions",
					fieldtype: "HTML",
					options: `<div id = "transactions"></div>`,
				},

			],
			body: me.page.body,
		});
		me.form.make();
	}

	make_reconciliation_tool() {
		const me = this;
		$("#transactions").empty();
		$("#cards").empty();
		// this.get_bank_balance()
		console.log(this.bank_account)
		console.log(this.bank_statement_from_date)
		if(
			this.bank_account && this.bank_statement_to_date
		){
			me.get_account_closing_balance().then( () => {
				if(
					this.bank_account
					&& this.bank_statement_from_date
					&& this.bank_statement_to_date
					&& this.bank_statement_closing_balance
				){
					me.render_chart();
					me.render_header();
					me.render();
					$("#cards").scrollTop();
				}
			});
		}
	}

	get_account_opening_balance() {
		const me = this
		if(
			this.bank_account && this.bank_statement_from_date
		){
			frappe.call({
				method:
					"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance",
				args: {
					bank_account: this.bank_account,
					till_date: me.bank_statement_from_date,
				},
				callback(response) {
					me.account_opening_balance = response.message;
					me.form.set_value(
						"account_opening_balance",
						me.account_opening_balance
					);
				},
			});
		}
	}


	get_account_closing_balance() {
		const me = this
		if (this.bank_account && this.bank_statement_to_date){
			return frappe.call({
				method:
					"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_account_balance",
				args: {
					bank_account: this.bank_account,
					till_date: me.bank_statement_to_date,
				},
				callback(response) {
					me.account_closing_balance = response.message;

				},
			});
		}
	}


	render_chart() {
		// $(".report-summary").remove();
		const me = this;
		this.$summary = $(`<div class="report-summary"></div>`)
			.hide()
			.appendTo(this.$cards);
		var chart_data = [
			{
				value: me.bank_statement_closing_balance,
				label: "Statement Ending Balance",
				datatype: "Currency",
				currency: "INR",
			},
			{
				value: me.account_closing_balance,
				label: "Cleared Balance",
				datatype: "Currency",
				currency: "INR",
			},
			{
				indicator: me.bank_statement_closing_balance - me.account_closing_balance?"Green" : "Red" ,
				value: me.bank_statement_closing_balance - me.account_closing_balance,
				label: "Difference",
				datatype: "Currency",
				currency: "INR",
			},
		];

		chart_data.forEach((summary) => {
			frappe.widget.utils
				.build_summary_item(summary)
				.appendTo(this.$summary);
		});
		this.$summary.css('border-bottom','0px')
		this.$summary.show();
	}

	render() {
		const me = this;
		if (me.bank_account) {
			return frappe.call({
				method:
					"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_bank_transactions",
				args: {
					// from_date: me.from_date,
					// to_date: me.to_date,
					bank_account: me.bank_account,
				},
				callback(response) {
					me.data = response.message;
					me.data.map((value) => {
						const row = $('<div class="list-row-container">')
							.data("data", value)
							.appendTo(me.$result)
							.get(0);
						new erpnext.accounts.ReconciliationRow(row, value);
					});
				},
			});
		}
	}

	render_header() {
		const me = this;
		// $(".transaction-header").remove();
		if ($(this.wrapper).find(".transaction-header").length === 0) {
			me.$result.append(
				frappe.render_template("bank_transaction_header", {})
			);
		}
	}
};


