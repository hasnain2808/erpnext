frappe.provide("erpnext.accounts");

erpnext.accounts.UploadStatememt = class UploadStatememt {
	constructor(wrapper) {
		this.make_upload_statement_dialog();
	}

	make_upload_statement_dialog() {
		const me = this;
		me.upload_statement_dialog = new frappe.ui.Dialog({
			title: __("Upload Bank Statements"),
			fields: me.get_upload_statement_dialog_fields(),
			size: "large",
			primary_action: (values) =>
				me.upload_statement_dialog_primary_action(values),
		});
	}

	get_upload_statement_dialog_fields() {
		const me = this;
		return [
			{
				fieldtype: "Link",
				fieldname: "company",
				label: __("Company"),
				options: "Company",
				change: () => me.upload_statement_dialog.refresh_dependency(),
			},
			{
				fieldtype: "Attach",
				fieldname: "bank_statement",
				depends_on: "eval: doc.bank_account",
				label: __("Attach Bank Statement"),
				change: () => me.on_bank_statement_uploaded(),
			},
			{
				fieldtype: "Column Break",
			},
			{
				fieldtype: "Link",
				fieldname: "bank_account",
				label: __("Bank Account"),
				options: "Bank Account",
				depends_on: "eval: doc.company",
				get_query: () => me.filter_by_company(),
				change: () => me.on_bank_account_selected(),
			},
			{
				fieldtype: "Link",
				fieldname: "bank",
				label: __("Bank"),
				options: "Bank",
				read_only: 1,
				depends_on: "eval: doc.bank_account",
				fetch_from: "doc.bank_account.bank",
			},

			{
				fieldname: "section_import_preview",
				fieldtype: "Section Break",
				label: __("Preview"),
				depends_on: "eval: doc.bank_statement",
			},
			{
				fieldname: "import_preview",
				fieldtype: "HTML",
				label: __("Import Preview"),
			},
			{
				fieldname: "template_warnings",
				fieldtype: "Code",
				hidden: 1,
				label: __("Template Warnings"),
				options: "JSON",
			},
			{
				fieldname: "import_warnings_section",
				fieldtype: "Section Break",
				label: __("Import File Errors and Warnings"),
				depends_on: "eval: doc.bank_statement",
			},
			{
				fieldname: "import_warnings",
				fieldtype: "HTML",
				label: __("Import Warnings"),
			},
		];
	}

	filter_by_company() {
		const me = this
		return {
			filters: {
				company: [
					"in",
					[me.upload_statement_dialog.get_value("company") || ""],
				],
			},
		};
	}

	on_bank_statement_uploaded() {
		const me = this;
		if (me.upload_statement_dialog.get_value("bank_statement"))
			me.show_preview();
		me.upload_statement_dialog.refresh_dependency();
	}

	on_bank_account_selected() {
		const me = this;
		me.upload_statement_dialog.refresh_dependency();
		frappe.call({
			method: "frappe.client.get_value",
			args: {
				doctype: "Bank Account",
				filters: me.get_bank_account_filters(),
				fieldname: ["bank"],
			},
			callback: (r) => me.set_bank(r.message),
		});
	}

	get_bank_account_filters() {
		const me = this;
		return { name: me.upload_statement_dialog.get_value("bank_account") };
	}

	set_bank(message) {
		const me = this
		me.upload_statement_dialog.set_value("bank", message["bank"]);
	}

	upload_statement_dialog_primary_action(values) {
		const me = this;
		if (!values.bank_statement) return;
		me.start_import(values);
		me.upload_statement_dialog.hide();
		me.template_options = "{}";
		delete me.upload_statement_dialog;
		me.make_upload_statement_dialog();
	}

	start_import(values) {
		const me = this;
		frappe.call({
			method:
				"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.form_start_import",
			args: me.get_import_args(values),
			callback: (r) => me.show_bg_import_message(r),
		});
	}

	get_import_args(values) {
		return {
			import_file_path: values.bank_statement,
			template_options: this.template_options,
			bank_account: values.bank_account,
		};
	}
	show_bg_import_message(r) {
		if (!r.message) return;
		const message = __("The Transactions will be imported in background");
		frappe.show_alert({ message: message, indicator: "green" }, 5);
	}
	show_preview() {
		const me = this;
		const file_name = me.upload_statement_dialog.get_value(
			"bank_statement"
		);
		me.upload_statement_dialog.get_field("import_preview").$wrapper.empty();
		$('<span class="text-muted">')
			.html(__("Loading import file..."))
			.appendTo(
				me.upload_statement_dialog.get_field("import_preview").$wrapper
			);
		frappe
			.call({
				method:
					"erpnext.accounts.page.bank_reconciliation_tool.bank_reconciliation_tool.get_importer_preview",
				args: {
					import_file_path: file_name,
					template_options: me.template_options,
				},
				error: {
					TimestampMismatchError() {
						// ignore this error
					},
				},
			})
			.then((r) => {
				let preview_data = r.message["preview"];
				me.show_import_preview(
					me.upload_statement_dialog,
					preview_data
				);
				me.show_import_warnings(
					me.upload_statement_dialog,
					preview_data
				);
			});
	}

	show_import_preview(frm, preview_data) {
		const me = this;
		let import_log = JSON.parse(frm.get_value("import_log") || "[]");
		me.upload_statement_dialog.get_primary_btn().show();

		if (
			frm.import_preview &&
			frm.import_preview.doctype === frm.get_value("reference_doctype")
		) {
			frm.import_preview.preview_data = preview_data;
			frm.import_preview.import_log = import_log;
			frm.import_preview.refresh();
			return;
		}
		frm.import_preview = new erpnext.accounts.ImportPreviewDialog({
			wrapper: frm.get_field("import_preview").$wrapper,
			doctype: "Bank Transaction",
			preview_data,
			import_log,
			frm,
			events: {
				remap_column(changed_map) {
					let template_options = JSON.parse(
						me.template_options || "{}"
					);
					template_options.column_to_field_map =
						template_options.column_to_field_map || {};
					Object.assign(
						template_options.column_to_field_map,
						changed_map
					);
					me.template_options = JSON.stringify(template_options);
					me.show_preview();
				},
			},
		});
	}

	show_import_warnings(frm, preview_data) {
		let columns = preview_data.columns;
		let warnings = JSON.parse(frm.get_value("template_warnings") || "[]");
		warnings = warnings.concat(preview_data.warnings || []);
		if (warnings.length === 0) {
			frm.get_field("import_warnings").$wrapper.html("");
			return;
		}
		let warnings_by_row = {};
		let other_warnings = [];
		for (let warning of warnings) {
			if (warning.row) {
				warnings_by_row[warning.row] =
					warnings_by_row[warning.row] || [];
				warnings_by_row[warning.row].push(warning);
			} else {
				other_warnings.push(warning);
			}
		}

		let html = "";
		html += Object.keys(warnings_by_row)
			.map((row_number) => {
				let message = warnings_by_row[row_number]
					.map((w) => {
						if (w.field) {
							let label =
								w.field.label +
								(w.field.parent !== frm.doc.reference_doctype
									? ` (${w.field.parent})`
									: "");
							return `<li>${label}: ${w.message}</li>`;
						}
						return `<li>${w.message}</li>`;
					})
					.join("");
				return `
				<div class="warning" data-row="${row_number}">
					<h5 class="text-uppercase">${__("Row {0}", [row_number])}</h5>
					<div class="body"><ul>${message}</ul></div>
				</div>
			`;
			})
			.join("");

		html += other_warnings
			.map((warning) => {
				let header = "";
				if (warning.col) {
					let column_number = `<span class="text-uppercase">${__(
						"Column {0}",
						[warning.col]
					)}</span>`;
					let column_header = columns[warning.col].header_title;
					header = `${column_number} (${column_header})`;
				}
				return `
					<div class="warning" data-col="${warning.col}">
						<h5>${header}</h5>
						<div class="body">${warning.message}</div>
					</div>
				`;
			})
			.join("");
		frm.get_field("import_warnings").$wrapper.html(`
			<div class="row">
				<div class="col-sm-10 warnings">${html}</div>
			</div>
		`);
	}
};
