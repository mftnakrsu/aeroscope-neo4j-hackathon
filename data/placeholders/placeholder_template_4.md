#Requirement: REQ-{{ID}}
PROJECT NAME: {{PROJECT_NAME}}
MODULE NAME: {{MODULE_NAME}}
BASELINE: {{BASELINE_VERSION}}
ABSOLUTE PATH: {{ABSOLUTE_PATH}}
Header: AMAÇ
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{PURPOSE_DESCRIPTION}} ||
Header: KAPSAM
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SCOPE_DESCRIPTION}} ||
Header: REFERANSLAR
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{REFERENCE_DESCRIPTION}} ||
Header: KISALTMALAR/TANIMLAR
|Kısaltma|Tanım|
--------------------------------------------------
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
|{{ACRONYM}}|{{DEFINITION}}|
--------------------------------------------------
Header: GEREKSİNİMLER
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FREQUENCY_AND_TIMING_DESC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DEVICE_COUNT_DESC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MESSAGE_TABLE_DESC}}
Message Name Freq. CAN ID Length(Byte) Direction Reference
{{MSG_NAME}} {{FREQ}} {{CAN_ID}} {{LEN}} {{DIR}} {{REF}}
{{MSG_NAME}} {{FREQ}} {{CAN_ID}} {{LEN}} {{DIR}} {{REF}}
...
Tablo - {{DEVICE}} Mesajları
Not: {{DIRECTION_NOTE}} ||
Header: Haberleşme Yönetimi
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SLOT_MGMT_DESC}}
{{MSG_LIST_ITEM}}
{{MSG_LIST_ITEM}}
...
Not: {{SLOT_TIMING_NOTE}}
Not2: {{CONDITIONAL_SENDING_NOTE}}
||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SLOT_TABLE_REF}} ||
Header: Haberleşme Hatası Yönetimi
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TIMEOUT_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TIMEOUT_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
...
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COM_STATUS_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COM_STATUS_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
Header: Isıtıcı Yönetimi
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MSG_RESPONSE_LOGIC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{POWER_STATE_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{POWER_STATE_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEATER_MODE_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{PENDING_CONDITION}} aşağıdaki işlemleri yapacaktır.
1) {{ACTION_1}}
2) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEATER_OFF_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEATER_RESTORE_CONDITION}} {{INTERNAL_FIELD}} alanına {{INTERNAL_FIELD}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEATER_STATUS_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ICING_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ICING_CLEAR_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEATER_CMD_CHANGE}} aşağıdaki işlemleri yapacaktır.
1) {{CMD_ASSIGNMENT}}
2) {{MSG_SENDING}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEATER_MODE_CHANGE}} aşağıdaki işlemleri yapacaktır.
1) {{CMD_ASSIGNMENT}}
2) {{MSG_SENDING}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_CMD_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_CMD_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_CMD_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DEVICE_BEHAVIOR_DESC}} ||
Header: Sorgu Yönetimi
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{REDUNDANCY_CONDITION}} mesajları göndercektir. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TIMEOUT_ACTION}} aşağıdaki işlemleri yapacaktır.
a) {{TM_ASSIGNMENT}}
b) {{TM_ASSIGNMENT}}
c) {{MSG_SENDING}}
Not1: {{TIMING_REF}}
Not2: {{RESTART_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{PENDING_LOGIC}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{PENDING_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SLOT_BLOCKING_CONDITION}} göndermeyecektir.
Not: {{SLOT_BLOCKING_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SLOT_RESUME_CONDITION}} göndermeye devam edecektir.
Not: {{SLOT_RESUME_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{BIT_CONDITION}} aşağıdaki işlemleri sırasıyla yapacaktır.
1) {{MSG_SENDING}}
2) {{MSG_SENDING}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{IBIT_EVALUATION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
Header: Cihaz Yönetimi
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{STATE_PRIORITY_LIST}}
1) {{STATE_1}}
2) {{STATE_2}}
3) {{STATE_3}}
4) {{STATE_4}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{STATE_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{STATE_TRANSITION}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{STATE_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{STATE_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacak
Header: Genel
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INVALID_DATA_HANDLING}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INVALID_DATA_FLAG}} {{INTERNAL_FIELD}} alanına {{TIMEOUT}} ms boyunca
Not: {{FLAG_RESET_NOTE}}
Not2: {{FLAG_PERSISTENCE_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{CBIT_EVALUATION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{VALIDITY_LOGIC}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacak
Header: AGM Atamaları
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{AGM_ASSIGNMENT_DESC}} ||
Header: {{DEVICE}} AGM Atamaları
|Referans Alan|Atanacak AGM Alanı|Atanacak AGM Alanı|
--------------------------------------------------
--------------------------------------------------
|{{REF_FIELD}}||{{AGM_FIELD}}|
--------------------------------------------------
|{{REF_FIELD}}|{{AGM_FIELD}}|{{AGM_FIELD}}|
--------------------------------------------------
|{{REF_FIELD}}|{{AGM_FIELD}}|{{AGM_FIELD}}|
--------------------------------------------------
|{{REF_FIELD}}|{{AGM_FIELD}}|{{AGM_FIELD}}|
--------------------------------------------------
...
Header: GİRDİ/ÇIKTI TABLOLARI
Table Type: MESSAGE
Table Name or Description: Internal
Table: Internal
|Name|Unit|Range|Default_Value|
--------------------------------------------------
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|
--------------------------------------------------
