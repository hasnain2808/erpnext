import frappe
from erpnext.accounts.utils import get_balance_on
from frappe.core.doctype.data_import.importer import Importer


@frappe.whitelist()
def get_bank_transactions(bank_account, from_date = None, to_date = None):
	filters = []
	filters.append(['bank_account' ,'=', bank_account])
	if to_date:
		filters.append(['date' ,'<=', to_date])
	if from_date:
		filters.append(['date' ,'>=', from_date])
	transactions = frappe.get_list(
		'Bank Transaction',
		fields = ['date', 'debit', 'credit', 'currency',
		'description', 'name', 'bank_account', 'company',
		'reference_number', 'transaction_id'],
		filters = filters
	)
	print(len(transactions))
	return transactions

@frappe.whitelist()
def get_account_balance(bank_account, till_date):
	account = frappe.db.get_value('Bank Account', bank_account, 'account')
	print(account)
	balance_as_per_system = get_balance_on(account, till_date)
	print(balance_as_per_system)
	return balance_as_per_system


@frappe.whitelist()
def get_importer_preview(import_file_path, data_import=None, template_options=None):
	if(data_import):
		frappe.db.set_value('Data Import', data_import, 'template_options', template_options)

		dat_data_import = frappe.get_doc(doctype="Data Import",name = data_import)
		# dat_data_import.save()
		importer = Importer("Bank Transaction", data_import=dat_data_import, file_path = import_file_path)
	else:
		importer = Importer("Bank Transaction", file_path = import_file_path)
	preview = importer.get_data_for_import_preview()
	print(importer.data_import)
	if(not data_import):
		importer.data_import.import_type = "Insert New Records"
		importer.data_import.reference_doctype = "Bank Transaction"
		importer.data_import.import_file = import_file_path
		importer.data_import.submit_after_import = 1
		importer.data_import.template_options = template_options
		importer.data_import.save()

	print(importer.data_import.name)
	print(preview)
	# return [preview, importer.data_import.name]
	return {"preview":preview, "import_name": importer.data_import.name}
