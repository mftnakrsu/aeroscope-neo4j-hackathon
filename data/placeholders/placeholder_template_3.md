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
Header: Modlar
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_LIST_DESC}}
    a) {{MODE_1}}
    b) {{MODE_2}}
    {{MODE_2}} modunun alt modları:
        1) {{SUBMODE_1}}
        2) {{SUBMODE_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INITIAL_MODE_DESC}}
Not: {{INITIAL_MODE_NOTE}} ||
Header: {{MODE_1}} Modu
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_TRANSITION_CONDITION}} {{MODE_2}} moduna geçecektir. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_STATE_ASSIGNMENT}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacaktır. ||
Header: {{MODE_2}} Modu
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INITIAL_SUBMODE_DESC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_TRANSITION_CONDITION}} {{MODE_1}} moduna geçecektir. ||
Header: {{SUBMODE_1}} Modu
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SUBMODE_TRANSITION_CONDITION}} {{SUBMODE_2}} moduna geçecektir. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_STATE_ASSIGNMENT}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacaktır. ||
Header: {{SUBMODE_2}} Modu
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEALTHY_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FAULT_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TIMEOUT_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATE_VALUE}} atayacaktır. ||
Header: Genel
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DEFAULT_VALUE_USAGE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INTERNAL_FIELD_MAPPING}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COM_FAIL_TIMEOUT}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COM_PASS_CONDITION}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{POWER_CMD_OFF}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{POWER_CMD_ON}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{PRIORITY_POWER_ON}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_USAGE_CHANGE}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_USAGE_CHANGE}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_USAGE_CHANGE}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_USAGE_CHANGE}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_CONFLICT_RESOLVE}} {{INTERNAL_FIELD}} ve {{INTERNAL_FIELD}} alanlarına {{STATUS_VALUE}} atayacaktır.
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{POSITION_UPDATE_REQUEST}} aşağıdaki işlemleri yaparak {{MSG_NAME}} mesajını gönderilecektir.
a) {{FIELD_1}} {{CONVERSION_NOTE}}
b) {{FIELD_2}} {{CONVERSION_NOTE}}
c) {{FIELD_3}}
Not: {{CONVERSION_REF}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INTERFACE_ACTIVATION_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INTERFACE_ACTIVATION_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INTERFACE_ACTIVATION_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{STATUS_MAPPING_TABLE}}
AGM Alanı    Atanacak Alan
{{AGM_FIELD}}    {{SOURCE_FIELD}}
{{AGM_FIELD}}    {{SOURCE_FIELD}}
...
Not: {{VALUE_MAPPING_NOTES}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_READY_TIMEOUT}} {{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_READY_CONDITION}} {{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{BIT_REQUEST_CONDITION}} aşağıdaki işlemleri yapacaktır.
a) {{MSG_SENDING}}
b) {{BIT_STATUS_MAPPING}}
c) {{MSG_SENDING}}
AGM Alanı    Atanacak Değer
{{AGM_FIELD}}    {{VALUE}}
...
Not: {{VALUE_MAPPING_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{POSITION_SETTING_MSG}} {{MSG_NAME}} mesajını gönderilecektir.
HVT Komut Alanı Atanacak Alan
{{CMD_FIELD}}    {{SOURCE_FIELD}}
...
Not: {{CONVERSION_NOTES}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_USAGE_MISMATCH}} {{MSG_NAME}} mesajını gönderilecektir.
HVT Komut Alanı Atanacak Alan
{{CMD_FIELD}}    {{SOURCE_FIELD}}
{{CMD_FIELD}}    {{SOURCE_FIELD}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{CONFIG_UPDATE_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir.
HVT Komut Alanı Atanacak Alan
{{CMD_FIELD}}    {{CONDITION_REF}}
...
Not: {{VALUE_INVERSION_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{POWER_CONTROL_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir.
a) {{FIELD_ASSIGNMENT}}
Not: {{DEFAULT_RETENTION_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_TRACK_ERROR}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not1: {{MATH_NOTE}}
Not2: {{TOLERANCE_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ANTENNA_TRACK_OK}} {{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not1: {{MATH_NOTE}}
Not2: {{TOLERANCE_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FIELD_COPY}} {{INTERNAL_FIELD}} alanına {{SOURCE_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{NVRAM_SAVE_CONDITION}} aşağıdaki işlemleri yapacaktır.
    a) {{FIELD_ASSIGNMENT}}
    b) {{FIELD_ASSIGNMENT}}
    c) {{FIELD_ASSIGNMENT}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{NVRAM_READ_CONDITION}} aşağıdaki işlemleri yapacaktır.
    a) {{FIELD_ASSIGNMENT}} {{CONVERSION_NOTE}}
    b) {{FIELD_ASSIGNMENT}} {{CONVERSION_NOTE}}
    c) {{FIELD_ASSIGNMENT}}
Not: {{CONVERSION_REF}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{AUTO_CONFIG_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir.
HVT Komut Alanı Atanacak Alan
{{CMD_FIELD}}    {{VALUE}}
...
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{AUTO_ANTENNA_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir.
HVT Komut Alanı Atanacak Alan
{{CMD_FIELD}}    {{VALUE}}
{{CMD_FIELD}}    {{VALUE}}
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{AUTO_POSITION_CONDITION}} {{MSG_NAME}} mesajını gönderilecektir.
HVT Komut Alanı Atanacak Alan
{{CMD_FIELD}}    {{SOURCE_FIELD}}
...
* {{CONVERSION_NOTE}}
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INVALID_DATA_HANDLING}} ||
Header: Mesaj Gönderim
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SENDING_TIMING_DESC}}
a) {{PERIOD_DESC}}
b) {{FIRST_SLOT_MSG}}
c) {{SECOND_THIRD_SLOT_MSG}}
d) {{LOOP_DESC}}
Not: {{REDUNDANCY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUEUE_PRIORITY_DESC}}
Örneğin: {{QUEUE_EXAMPLE}}
Not: {{QUEUE_DUPLICATE_NOTE}}
"aperiyodik mesaj gönderme kuyruğu"na ekleme öncelik sırası aşağıdaki şekildedir:
1. {{MSG_1}}
2. {{MSG_2}}
3. {{MSG_3}}
4. {{MSG_4}}
5. {{MSG_5}}
6. {{MSG_6}}
7. {{MSG_7}} ||
Header: CRC Hesabı
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{CRC_CALCULATION_DESC}}
{{CRC_CODE_BLOCK}} ||
Header: GİRDİ/ÇIKTI TABLOLARI
Table Type: MESSAGE
Table Name or Description: Internal
Table: Internal
|Name|Unit|Range|Default Value|AGM Alanı|
--------------------------------------------------
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}|
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}||
--------------------------------------------------
Header: EKLER
Header: {{APPENDIX_NAME}}
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{APPENDIX_DESCRIPTION}}
Örnek: {{EXAMPLE_1}}
        {{EXAMPLE_2}} ||
