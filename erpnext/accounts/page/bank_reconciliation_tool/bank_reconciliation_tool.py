import frappe
from erpnext.accounts.utils import get_balance_on
from frappe.core.doctype.data_import.importer import Importer
from frappe.model.document import Document
from frappe.utils.background_jobs import enqueue


@frappe.whitelist()
def get_bank_transactions(bank_account, from_date = None, to_date = None):
	filters = []
	filters.append(['bank_account' ,'=', bank_account])
	filters.append(['docstatus' ,'=', 1])
	filters.append(['unallocated_amount' ,'>', 0])
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
	dat_data_import = frappe.get_doc(doctype="Data Import")
	dat_data_import.import_type = "Insert New Records"
	dat_data_import.reference_doctype = "Bank Transaction"
	dat_data_import.import_file = import_file_path
	dat_data_import.submit_after_import = 1
	dat_data_import.template_options = template_options
	print(dat_data_import)
	print(dat_data_import.template_options)
	importer = Importer("Bank Transaction", data_import=dat_data_import, file_path = import_file_path)
	preview = importer.get_data_for_import_preview()
	return {"preview":preview, "import_name": importer.data_import.name}


@frappe.whitelist()
def form_start_import(import_file_path, data_import=None, template_options=None):


	from frappe.core.page.background_jobs.background_jobs import get_info
	from frappe.utils.scheduler import is_scheduler_inactive

	if is_scheduler_inactive() and not frappe.flags.in_test:
		frappe.throw(
			_("Scheduler is inactive. Cannot import data."), title=_("Scheduler Inactive")
		)

	enqueued_jobs = [d.get("job_name") for d in get_info()]
	if "bank_statement_import" not in enqueued_jobs:
		enqueue(
			start_import,
			queue="default",
			timeout=6000,
			event="data_import",
			job_name="bank_statement_import",
			import_file_path=import_file_path,
			data_import=data_import,
			template_options=template_options,
			now=frappe.conf.developer_mode or frappe.flags.in_test,
		)
		return True
	return False
	# return frappe.get_doc("Data Import", data_import).start_import()




def start_import(import_file_path, data_import=None, template_options=None):
	"""This method runs in background job"""
	# data_import = frappe.get_doc("Data Import", data_import)
	dat_data_import = frappe.get_doc(doctype="Data Import")
	dat_data_import.import_type = "Insert New Records"
	dat_data_import.reference_doctype = "Bank Transaction"
	dat_data_import.import_file = import_file_path
	dat_data_import.submit_after_import = 1
	dat_data_import.template_options = template_options
	try:
		i = Importer("Bank Transaction", data_import=dat_data_import, file_path = import_file_path)
		i.import_data()
	except Exception:
		frappe.db.rollback()
		data_import.db_set("status", "Error")
		frappe.log_error(title=data_import.name)
	finally:
		frappe.flags.in_import = False

	# frappe.publish_realtime("data_import_refresh", {"data_import": data_import.name})



