frappe.provide("erpnext.accounts");

frappe.require('/assets/js/data_import_tools.min.js', () => {

	erpnext.accounts.ImportPreviewDialog = class ImportPreviewDialog extends frappe.data_import.ImportPreview {
		constructor(opts) {
			super(opts);
		}

		add_actions() {

			let actions = [
				{
					label: __('Map Columns'),
					handler: 'show_column_mapper',
					condition: true
				},
			];
			let html = actions
				.filter(action => action.condition)
				.map(action => {
					return `<button class="btn btn-sm btn-default" data-action="${action.handler}">
						${action.label}
					</button>
				`;
				});
			this.wrapper.find('.table-actions').html(html);
		}

		show_column_mapper() {
			let column_picker_fields = this.get_columns_for_picker(this.doctype);
			let changed = [];
			let fields = this.preview_data.columns.map((col, i) => {
				let df = col.df;
				if (col.header_title === 'Sr. No') return [];

				let fieldname;
				if (!df) {
					fieldname = null;
				} else if (col.map_to_field) {
					fieldname = col.map_to_field;
				} else if (col.is_child_table_field) {
					fieldname = `${col.child_table_df.fieldname}.${df.fieldname}`;
				} else {
					fieldname = df.fieldname;
				}
				return [
					{
						label: '',
						fieldtype: 'Data',
						default: col.header_title,
						fieldname: `Column ${i}`,
						read_only: 1
					},
					{
						fieldtype: 'Column Break'
					},
					{
						fieldtype: 'Autocomplete',
						fieldname: i,
						label: '',
						max_items: Infinity,
						options: [
							{
								label: __("Don't Import"),
								value: "Don't Import"
							}
						].concat(this.get_fields_as_options(this.doctype, column_picker_fields)),
						default: fieldname || "Don't Import",
						change() {
							changed.push(i);
						}
					},
					{
						fieldtype: 'Section Break'
					}
				];
			});
			// flatten the array
			fields = fields.reduce((acc, curr) => [...acc, ...curr]);
			let file_name = (this.frm.get_value('import_file') || '').split('/').pop();
			let parts = [file_name.bold(), this.doctype.bold()];
			fields = [
				{
					fieldtype: 'HTML',
					fieldname: 'heading',
					options: `
						<div class="margin-top text-muted">
						${__('Map columns from {0} to fields in {1}', parts)}
						</div>
					`
				},
				{
					fieldtype: 'Section Break'
				}
			].concat(fields);

			let dialog = new frappe.ui.Dialog({
				title: __('Map Columns'),
				fields,
				primary_action: values => {
					let changed_map = {};
					changed.map(i => {
						let header_row_index = i - 1;
						changed_map[header_row_index] = values[i];
					});
					if (changed.length > 0) {
						this.events.remap_column(changed_map);
					}
					dialog.hide();
				}
			});
			dialog.$body.addClass('map-columns');
			dialog.show();
		}


		get_columns_for_picker(doctype) {
			let out = {};

			const exportable_fields = df => {
				let keep = true;
				if (frappe.model.no_value_type.includes(df.fieldtype)) {
					keep = false;
				}
				if (['lft', 'rgt'].includes(df.fieldname)) {
					keep = false;
				}
				return keep;
			};

			let doctype_fields = frappe.meta
				.get_docfields(doctype)
				.filter(exportable_fields);
			out[doctype] = [
				{
					label: __('ID'),
					fieldname: 'name',
					fieldtype: 'Data',
					reqd: 1
				}
			].concat(doctype_fields);

			// children
			const table_fields = frappe.meta.get_table_fields(doctype);
			table_fields.forEach(df => {
				const cdt = df.options;
				const child_table_fields = frappe.meta
					.get_docfields(cdt)
					.filter(exportable_fields);

				out[df.fieldname] = [
					{
						label: __('ID'),
						fieldname: 'name',
						fieldtype: 'Data',
						reqd: 1
					}
				].concat(child_table_fields);
			});

			return out;
		}


		get_fields_as_options(doctype, column_map) {
			let keys = [doctype];
			frappe.meta.get_table_fields(doctype).forEach(df => {
				keys.push(df.fieldname);
			});
			// flatten array
			return [].concat(
				...keys.map(key => {
					return column_map[key].map(df => {
						let label = df.label;
						let value = df.fieldname;
						if (doctype !== key) {
							let table_field = frappe.meta.get_docfield(doctype, key);
							label = `${df.label} (${table_field.label})`;
							value = `${table_field.fieldname}.${df.fieldname}`;
						}
						return {
							label,
							value,
							description: value
						};
					});
				})
			);
		}


	}
})
