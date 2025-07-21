Integration
Before testing an integration in the production environment, which involves real financial institutions, or FIs, and the transfer of real money, FinGrid allows testing in lower environments that have no real-world consequences. Integrations can be tested in the following progression:

Sandbox - Test Financial Institutions

Test Financial Institutions

Simulated money transfer

Production

Real Financial Institutions

Real money transfer

Sandbox - Test FIs
API_BASE_URL
https://sandbox.cabbagepay.com
JS Refrence
https://cabbagepay.com/js/sandbox/cabbage.js
Client ID/Secret: Sandbox keys must be used

During the account linking process, select any of the following test financial institutions:

FinBank Profiles - A
FinBank Profiles - B
Use any of the following credentials to log into the bank:

Test bank logins
profile_03

Select any of the provided accounts

To test successful linking and payments up to $4999

profile_04

Select any of the provided accounts

To test successful linking and insufficient funds

NOTE: The passwords are all the same as their corresponding usernames. For example: username: profile_03 -> password: profile_03

Production
API_BASE_URL
https://production.cabbagepay.com
JS Refrence
https://cabbagepay.com/js/production/cabbage.js
Client ID/Secret: Production keys must be used

Production environment is the final phase which will be used for your deployed integration. It will use real financial institutions and involve real money transfers.


SDKs
JavaScript SDK
Import the SDK directly in your HTML source.

Sandbox JS Reference
https://cabbagepay.com/js/sandbox/cabbage.js
Production JS Reference
https://cabbagepay.com/js/production/cabbage.js
This exposes a single global object, cabbage

HTML Script
import (cabbage) from "@cabbage/cabbage-js";

//We recommend you call this when the checkout page or review order page is loaded
cabbage.initializeGrid(link_token)";

//We recommend you call this when the user comfirms to "Pay with Bank"
cabbage.openGrid(link_token)";

//Set up a HostListener to receive data from the bank connection flow
@HostListener('window:message', ['$event'])
onMessage(event) (

const data = JSON.parse(event.data);

if(data.message == 'success')
{
	//At this point, you received a public_token for this bank connection flow.
	//You can use this to fetch a bank_token.
}

if(data.message == 'terminated')
{
	//User terminated the bank connection flow.
}

Success @HostListener Response
{
	"message": "success",
	"public_token": "public_sandbox_99570daad85e40dca88587da"
}
Methods 
initializeGrid(link_token)

=> void

We recommend to make this call either on checkout page load or when user selects their preferred payment method depending upon your UI setup

openGrid(link_token)

=> void

We recommend you call this when the user clicks on “Pay with Bank”

closeGrid

() => void

We recommend you call this when you receive the public_token from the bank connection flow

initializeFixGrid(bank_token)

=> void

We recommend to make this call to rejuvenate a bank_token

openFixGrid(bank_token)

=> void

We recommend to make this call when the user is ready to go through the bank reconnection flow

closeFixGrid

() => void

We recommend you call this when you receive successful confirmation from the bank reconnection flow

iOS SDK
Contact us to get started with our iOS SDKs. PDF documentation will be sent.

Android SDK
Contact us to get started with our Android SDKs. PDF documentation will be sent.

React Native SDK
Contact us to get started with our React Native SDKs. PDF documentation will be sent.

Create Link Token
Create a link_token to initialize bank connection flow. This enables your customers to instantly connect a bank to pay you.

Endpoint
{env_url}/api/custom/link/token/create

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

client_name

string

A client name to display during the bank connection flow

redirect_uri

string

A url we can redirect your users to after the of a bank connection flow

cust_phone_number

string - OPTIONAL

Your customer's phone number

cust_email

string - OPTIONAL CONDITION

Your customer's email

cust_first_name

string - OPTIONAL CONDITION

Your customer's first name

cust_last_name

string - OPTIONAL CONDITION

Your customer's last name

theme_color

string - OPTIONAL

A theme color of your choosing that will used during the bank connection flow. Must be a 6 digit HEX code

theme_logo

string - OPTIONAL

A theme logo of your choosing that will used during the bank connection flow.

connection

string - OPTIONAL

We support dynamic and static connections. This is an optional param depending upon your contract. Please contact your FinGrid rep to learn more


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"client_name": "{CLIENT_NAME}",
	"redirect_uri": "{CLIENT_REDIRECT_URI}",
	"cust_phone_number": "{CUSTOMER_PHONE_NUMBER}",
	"cust_email": "{CUSTOMER_EMAIL}",
	"cust_first_name": "{CUSTOMER_FIRST_NAME}",
	"cust_last_name": "{CUSTOMER_LAST_NAME}",
	"theme_color": "{CLIENT_THEME_COLOR}",
	"theme_logo": "{CLIENT_LOGO}",
	"connection": "{TYPE}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"client_name": "DoorDash",
	"redirect_uri": "https://doordash.com/bank-connection-success",
	"cust_phone_number": "8482607753",
	"cust_email": "pratt@fingrid.io",
	"cust_first_name": "Pratt",
	"cust_last_name": "Khot",
	"theme_color": "209913",
	"theme_logo": "logo.png"
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

link_token

string

A token that can be used to initiate a bank connection flow using one of our SDKs

request_id

string

A unique identifier for your API request


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"link_token": "link_sandbox_99570daad85e40dca88587da"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error",
	"request_id": "request_99570daad85e40dca88587da"
}

Return Codes
9450

Required: six digit HEX code for theme_color

5463

Required: cust_phone_number or cust_email

3957

Required: client_name

9384

Permission Denied

0113

Something went wrong. Contact FinGrid Dev team.

Exchange Public Token
Exchange public_token with a bank_token to create transactions

Endpoint
{env_url}/api/custom/link/public_token/exchange

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

public_token

string

A public token that you received via our SDKs after your customer successfully completed the bank connection flow


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"public_token": "{PUBLIC_TOKEN}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"public_token": "public_sandbox_6c6114de59334172a2ee57f0"
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

bank_token

string

A bank token that can be used to initiate transactions of various natures of push and pull

bank_name

string

Name of the bank associated with your customer

bank_account_last_four

string

Last 4 digits of your customer's bank account number

request_id

string

A unique identifier for your API request


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"bank_token": "bank_token_sandbox_b15d2bd79fab4c659d67f366",
	"bank_name": "TD Bank",
	"bank_account_last_four": "1504",
	"request_id": "request_34540daad85e40dca88587da",
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error",
	"request_id": "request_99570daad85e40dca88587da"
}

Return Codes
5748

Invalid public_token

9384

Permission Denied

0114

Something went wrong. Contact FinGrid Dev team.

Create Transaction
Create transaction using a bank_token

Endpoint
{env_url}/api/custom/transaction/move_cabbage

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

bank_token

string

Your customer's bank token that received from us after exchanging a public token post the bank connection flow

connected_acct

string

Your unique merchant ID

transaction_type

string

We support various types of transactions. Most importantly, "charge" and "send". Charge is to pull money from your customer's bank account and send money to your customer's bank account. Common possible values are "charge" and "send"

billing_type

string

We support various billing types. Most importantly, "single" and "recurring". Single is a one-time transaction and Recurring is repeated at a specific frequency. Contact your FinGrid rep to understand our recurring billing capabilities

speed

string

We support various transaction speed types. Most importantly, "next_day" and "same_day"

final_amount

double

A final amount associated with your transaction

application_fee_amount

double

A platform fee you intend to collect for this transaction

statement_descriptor

string - OPTIONAL

Value that will be passed to the banks to reflect on your customer's bank account statement. Note that all banks do not support this functionality

metadata

string - OPTIONAL

Data that will be passed to you after a transaction is successfully created just the way it was passed to us when you initiated the API call

ip_address

string - OPTIONAL

IP address associated when you customer commits to a transaction


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"ip_address": "{CUSTOMER_IP_ADDRESS}",
	"statement_descriptor": "{STATEMENT_DESCRIPTOR}",
	"metadata": "{METADATA}",
	"final_amount": "{FINAL_AMOUNT}",
	"bank_token": "{CUSTOMER_BANK_TOKEN}",
	"connected_acct": "{MERCHANT_CONNECTED_ACCT}",
	"transaction_type": "{TRANSACTION_TYPE}",
	"billing_type": "{BILLING_TYPE}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"ip_address": "68.934.074.03",
	"statement_descriptor": "Order #983454",
	"metadata": "483745",
	"final_amount": 83.94,
	"bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366",
	"connected_acct": "acct_034ae0d999f78e43de32",
	"transaction_type": "charge",
	"billing_type": "single"
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

request_id

string

A unique identifier for your API request

transaction_id

string

A unique ID created by us after a transaction is successfully created

create_date

string

Date and time when a transaction is successfully created

status

string

Status of the created transaction

final_charged_amount

double

A confirmation of the amount associated with your transaction

billing_type

string

A confirmation of the billing type associated with your transaction

transaction_type

string

A confirmation of the transaction type associated with your transaction

metadata

string

Metadata associated with your transaction that was passed to us by you while creating a transaction


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"request_id": "request_34540daad85e40dca88587da",
	"transaction_id": "transfer_f6736b3c6f334aa5b579c9de",
	"create_date": "2023-09-16 01:57:03.810",
	"status": "initiated",
	"final_charged_amount": 83.94,
	"billing_type": "single",
	"transaction_type": "charge",
	"metadata": "483745",
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error",
	"request_id": "request_99570daad85e40dca88587da"
}

Return Codes
pk1998

Transaction successfully created

1599

Invalid transaction_type

1598

Invalid billing_type

4851

This bank connection is expired. Apply for link_token and perform new bank connection.

1769

Transaction failed

1504

Insufficient funds

5041

Expired bank_token

5044

final_amount must be at least $1

5040

Invalid transfer_id

9384

Permission Denied

0115


View Transactions
View transactions for a merchant account

Endpoint
{env_url}/api/custom/transactions

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

connected_acct

string

A unique merchant ID to pull the transaction for

start_date

string

Start date to the pull the transaction from

end_date

string

End date to the pull the transaction before


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"connected_acct": "{MERCHANT_CONNECTED_ACCT}",
	"start_date": "{START_DATE}",
	"end_date": "{END_DATE}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"connected_acct": "acct_034ae0d999f78e43de32",
	"start_date": "2023-01-01",
	"end_date": "2023-01-31",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

transfers

object

A list of all transactions for a merchant ID between the specified date range


Success Response
{
	"cabbage_return_code": "pk1998",
	"transfers": "[]"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error",
	"request_id": "request_99570daad85e40dca88587da"
}

Return Codes
pk1998

Success

9485

Required: start_date, end_date

9384

Permission Denied

0117

Something went wrong. Contact FinGrid Dev team.


Cancel Transactions
Cancel transaction with a transfer_id

Endpoint
{env_url}/api/custom/transaction/cancel

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it

transfer_id

string

A transfer_id that was received when you created the transaction


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"transfer_id": "{TRANSFER_ID}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"transfer_id": "transfer_34037f011c864fc181e9e7c0",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

request_id

string

A unique identifier for your API request


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"request_id": "request_99570daad85e40dca88587da"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error",
	"request_id": "request_99570daad85e40dca88587da"
}

Return Codes
pk1998

Success

0294

Fail

0349

Invalid transfer_id

9384

Permission Denied

0116

Something went wrong. Contact FinGrid Dev team.


Check Transaction Status
Check transaction status of a transfer_id

Endpoint
{env_url}/api/custom/transaction/status

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

transfer_id

string

A transfer ID that you intend to check the status of


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"transfer_id": "{TRANSFER_ID}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"transfer_id": "transfer_34037f011c864fc181e9e7c0",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

transfer

object

Object of the requested transfer ID


Success Response
{
	"cabbage_return_code": "pk1998",
	"transfer": "[]"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

0349

Invalid transfer_id

9384

Permission Denied

0116

Something went wrong. Contact FinGrid Dev team.

Get Bank Token Details
Get bank_token details

Endpoint
{env_url}/api/custom/bank_token/details

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

bank_token

string

A bank token that you intend to fetch details for


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"bank_token": "{CUSTOMER_BANK_TOKEN}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

bank_name

string

Name of the bank associated with the bank token

routing_number

string

Routing number of the bank account

account_number

string

Account number of the bank account

request_id

string

Unique request identifier


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"bank_name": "Bank of America",
	"routing_number": "03122130",
	"account_number": "83759845343",
	"request_id": "request_xyz98r3"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

5769

Token invalid

5768

Token invalid

9384

Permission Denied


Check Bank Token Balance
Get live balance of a bank_token

Endpoint
{env_url}/api/custom/bank_token/balance

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

bank_token

string

A bank token that you intend to check the live balance


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"bank_token": "{CUSTOMER_BANK_TOKEN}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

available_balance

string

Value of the real time balance of the bank account

currency

string

Currency type of the bank account


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"available_balance": 9831.38,
	"currency": "USD"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

4837

Token suspended

0857

Manual token

4851

Bank connection expired

9851

Unable to retrieve live balance at this time

9384

Permission Denied

Check Bank Token Health
Retrieve health of a bank_token

Endpoint
{env_url}/api/custom/health/token/bank_token

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

bank_token

string

A bank token that you intend to check the health of


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"bank_token": "{CUSTOMER_BANK_TOKEN}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

4851

Token expired

5748

Invalid bank_token

9384

Permission Denied

Get Bank Token Owner
Get owner of a bank_token

Endpoint
{env_url}/api/custom/bank_token/owner

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

bank_token

string

A bank token that you intend to get owner details for


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"bank_token": "{CUSTOMER_BANK_TOKEN}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"bank_token": "bank_token_sandbox_b1de80d70fab4c659d67f366",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

owner_name

string

Name of the back account owner

owner_address

string

Address of the owner of the bank account


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"owner_name": "John Doe",
	"owner_address": "100 Wall St, New York, NY 10005"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

4851

Unable to retreive bank token owner details

9851

Unable to retreive bank token owner details

4769

Invalid bank token

0857

Manual token

4837

Token suspended

9384

Permission denied


Onboard New Merchant
Create a new MID (Merchant ID)

Endpoint
{env_url}/api/custom/onboard/merchant

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

business_name

string

Registered business name.

business_ein

string

Employer Identification Number.

business_email

string

Email address of the business.

business_website

string

Business’ website

business_phone

string

Business's 10 digit phone number. No hyphens or other separators, e.g. 9876543210.

business_street_address

string

Street number, street name of business’ physical address.

business_city

string

City of business’ physical address.

business_state

string

Two-letter US state or territory abbreviation code of business’ physical address.

business_postal_code

string

Business’ US five-digit ZIP

business_registration_state

string

Two-letter US state or territory abbreviation code of business’ registration state.

business_classification

string

The industry classification Id that corresponds to merchant’s business.

business_type

string

Business structure. Possible values are corporation, llc, partnership.

business_bank_name

string

Name of the banking financial institution

business_bank_account_number

string

Payout bank account number

business_bank_routing_number

string

Payout bank routing number

controller_first_name

string

The legal first name of the controller.

controller_last_name

string

The legal last name of the controller.

controller_title

string

Job title of the merchant’s controller. e.g. Chief Financial Officer

controller_ssn

string

All-digits of controller’s social security number. Required for controllers who reside in the United States.

controller_dob

string

The date of birth of the controller. Formatted in YYYY-MM-DD format. Must be 18 years or older.

controller_street_address

string

Street number, street name of controller’s physical address.

controller_city

string

City of Controller’s physical address.

controller_state

string

Two-letter US state or territory abbreviation code of controller’s physical address.

controller_postal_code

string

Controller’s’ US five-digit ZIP.

controller_country

string

Country of controller's physical address. Two digit ISO code, e.g. US.


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"business_name": "{BUSINESS_NAME}",
	"business_ein": "{BUSINESS_EIN}",
	"business_email": "{BUSINESS_EMAIL}",
	"business_website": "{BUSINESS_WEBSITE}",
	"business_phone": "{BUSINESS_PHONE}",
	"business_street_address": "{BUSINESS_STREET_ADDRESS}",
	"business_city": "{BUSINESS_CITY}",
	"business_state": "{BUSINESS_STATE}",
	"business_postal_code": "{BUSINESS_POSTAL_CODE}",
	"business_registration_state": "{BUSINESS_REGISTRATION_STATE}",
	"business_classification": "{BUSINESS_CLASSIFICATION}",
	"business_type": "{BUSINESS_TYPE}",
	"business_bank_name": "{BUSINESS_BANK_NAME}",
	"business_bank_account_number": "{BUSINESS_BANK_ACCOUNT_NUMBER}",
	"business_bank_routing_number": "{BUSINESS_BANK_ROUTING_NUMBER}",
	"controller_first_name": "{CONTROLLER_FIRST_NAME}",
	"controller_last_name": "{CONTROLLER_LAST_NAME}",
	"controller_title": "{CONTROLLER_TITLE}",
	"controller_ssn": "{CONTROLLER_SSN}",
	"controller_dob": "{CONTROLLER_DOB}",
	"controller_street_address": "{CONTROLLER_STREET_ADDRESS}",
	"controller_city": "{CONTROLLER_CITY}",
	"controller_state": "{CONTROLLER_STATE}",
	"controller_postal_code": "{CONTROLLER_POSTAL_CODE}",
	"controller_country": "{CONTROLLER_COUNTRY}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"business_name": "Alpine Inc",
	"business_ein": "00-0000000",
	"business_email": "xyz@xyz.com",
	"business_website": "xyz.com",
	"business_phone": "9876543210",
	"business_street_address": "210 23rd St",
	"business_city": "New York",
	"business_state": "NY",
	"business_postal_code": "10005",
	"business_registration_state": "DE",
	"business_classification": "Ask Support",
	"business_type": "llc",
	"business_bank_name": "TD Bank",
	"business_bank_account_number": "3947597435",
	"business_bank_routing_number": "031201360",
	"controller_first_name": "Pratt",
	"controller_last_name": "Khot",
	"controller_title": "CEO",
	"controller_ssn": "982228383",
	"controller_dob": "1998-09-01",
	"controller_street_address": "234 47th St",
	"controller_city": "New York",
	"controller_state": "NY",
	"controller_postal_code": "10005",
	"controller_country": "US"
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below.

message

string

Possible values are success, and fail.

onboard_id

string

A unique identifier for a new merchant onboarding request.

request_id

string

A unique identifier for your API request.


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"onboard_id": "onboard_43aad85e40dca88587da",
	"request_id": "request_99570daad85e40dca88587da"
}

Fail Response
{
	"cabbage_return_code": "6274",
	"message": "Reason for the error",
	"request_id": "request_99570daad85e40dca88587da"
}

Return Codes
pk1998

Onboard request successfully created.

6274

Something is missing in the onboard request.

Fetch MID Wallet Balance
Fetch a merchant's wallet balance

Endpoint
{env_url}/api/custom/connected_acct/wallet/balance

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

connected_acct

string

A connected_acct (MID) that you intend to fetch the wallet balance for


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"connected_acct": "{MERCHANT_CONNECTED_ACCT}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"connected_acct": "acct_b1de80d70fab4c659d67f366",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

balance

string

Balance amount

last_updated

string

Timestamp of the latest balance update


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"balance": "3832.09",
	"last_updated": "2025-03-23T22:04:46.772Z"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

3452

Unable to fetch balance

9384

Permission Denied

Fetch MID Details
Fetch a merchant's wallet balance

Endpoint
{env_url}/api/custom/connected_acct/details

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

connected_acct

string

A connected_acct (MID) that you intend to fetch details for


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"connected_acct": "{MERCHANT_CONNECTED_ACCT}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"connected_acct": "acct_b1de80d70fab4c659d67f366",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

bank_name

string

Bank name

bank_account_number_last_four

string

Bank account last four digits


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"bank_name": "TD Bank",
	"bank_account_number_last_four": "3452"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

9384

Permission Denied

Create MID Payouts
Create a payout for a connected_acct (MID) from wallet balance

Endpoint
{env_url}/api/custom/connected_acct/payout/create

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

connected_acct

string

A connected_acct (MID) that you intend to fetch details for

payout_amount

double

An amount you intend to payout

speed

string

We support various transaction speed types. Most importantly, "next_day" and "same_day"

application_fee_amount

double

A platform fee you intend to collect for this payout

statement_descriptor

string - OPTIONAL

Value that will be passed to the banks to reflect on your customer's bank account statement. Note that all banks do not support this functionality

metadata

string - OPTIONAL

Data that will be passed to you after a transaction is successfully created just the way it was passed to us when you initiated the API call


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}",
	"connected_acct": "{MERCHANT_CONNECTED_ACCT}",
	"payout_amount": "{PAYOUT_AMOUNT}",
	"speed": "{SPEED_TYPE}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7",
	"connected_acct": "acct_b1de80d70fab4c659d67f366",
	"payout_amount": "647.90",
	"speed": "same_day",
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

payout_id

string

Unique payout identifier

amount

double

Amount paid out

speed

string

Speed of payout


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"amount": 647.90,
	"speed": "same_day",
	"payout_id": "payout_xy398rf59"
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

3412

Invalid payout amount

3452

Payout request invalid

9834

Permission denied

Get Connected Accounts
Get all connected accounts with your credentials

Endpoint
{env_url}/api/custom/connect/connected_accounts

Request Body
client_id

string

Your client_id provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.

secret

string

Your secret_key provided in this dashboard. Navigate to the "Your Credentials" tab to retrieve it.


POST Request
{
	"client_id": "{CLIENT_ID}",
	"secret": "{CLIENT_SECRET}"
}

Sample Request
{
	"client_id": "360fa6e279a141548ba417aa",
	"secret": "e96434ffbe764dc4972b85c7"
}

Response Body
cabbage_return_code

string

A return code from the list of return codes below

message

string

Possible values are success, and fail

connected_accounts

string

List of all connected accounts with your account


Success Response
{
	"cabbage_return_code": "pk1998",
	"message": "success",
	"connected_accounts": []
}

Fail Response
{
	"cabbage_return_code": "9384",
	"message": "Reason for the error"
}

Return Codes
pk1998

Success

0039

No connected accounts found

9384

Permission denied

Webhooks
Subscribing to and receiving webhooks
We design and shoot unique payloads to our enterprise clients depending upon the business models and money flow natures. Please check with FinGrid Support to configure webhooks for your account.


An example payload
Example Payload Structure
{
	"secret": "YOUR_SECRET",
	"id": "webhook_0cb911a6e37945bf95e4c5f9",
	"resourceId": "transfer_7ed5rj95rc3a64b23b52fa41e"
	"topic": "transfer_completed"
	"timestamp": "2023-09-12T11:06:04.1004824+00:00"
}

A few examples of our webhook events
bank_token_created

Webhook sent when a bank token is successfully created

bank_token_suspended

Webhook sent when a bank token is suspended

bank_token_expired

Webhook sent when a bank token is expired

transfer_completed

Webhook sent when a transaction is successfully settled in FBO

transfer_failed

Webhook sent when a transaction fails due to any return codes (Please check return codes in ACH Network tab)

payout_initiated

Webhook sent when a payout is successfully created

payout_completed

Webhook sent when a payout is successfully completed

payout_failed

Webhook sent when a payout fails

Contact us to design your unique payload suited for your money flow needs.