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
Header: GEREKSİNİMLER
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FREQUENCY_AND_TIMING_DESC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ENDIAN_AND_BIT_ORDER_DESC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DEFAULT_VALUE_USAGE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{GCSID_BURN_CONDITION}} {{INTERNAL_FIELD}} alanına {{SOURCE_FIELD}} alanını atayacaktır.
Not 1: {{PRIORITY_NOTE}}
Not 2: {{COMPARISON_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{UAVID_BURN_CONDITION}} {{INTERNAL_FIELD}} alanına {{SOURCE_FIELD}} alanının değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{GCSID_BURN_CONDITION}} {{INTERNAL_FIELD}} alanına {{SOURCE_FIELD}} alanının değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{NVRAM_MISMATCH_CONDITION}} {{INTERNAL_FIELD}} alanına {{BOOL_VALUE}}, diğer durumlarda {{BOOL_VALUE}} atayacaktır.
Not: {{COMPARISON_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{NVRAM_MISMATCH_CONDITION}} {{INTERNAL_FIELD}} alanına {{BOOL_VALUE}}, diğer durumlarda {{BOOL_VALUE}} atayacaktır.
Not: {{COMPARISON_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MAX_INSTANCE_CALCULATION}} {{INTERNAL_FIELD}} alanına atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TM_139_PRIORITY_LIST}}
1) {{MSG_1}}
2) {{MSG_2}}
...
11) {{MSG_11}}
Not1: {{PRIORITY_NOTE_1}}
Not2: {{PRIORITY_NOTE_2}}
Not3: {{AUTONOMOUS_NOTE}}
Not4: {{CHANGE_DETECTION_NOTE}}
* {{FIELD_MAPPING_TABLE}}
{{THIS_FCC_FIELD}} {{OTHER_FCC_FIELD}}
...
||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_ASSIGNMENT}} {{INTERNAL_FIELD}} değerini atayacaktır. ||
Header: Telekomut Mesajlarının Kontrolü
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TRIPLE_CHECK_CONDITION}} bu değeri geçerli sayıp yine kendi alanına aktaracaktır.
# Mesaj Alanı
1 {{FIELD_1}}
2 {{FIELD_2}}
...
10 {{FIELD_10}}
Not: {{EXECUTION_NOTE}} ||
Header: Telekomut Mesajlarının Diğer Bölüntülere Aktarılması
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MSG_TRANSFER_LOGIC}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MSG_NOT_RECEIVED_LOGIC}} {{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: Tablo - {{TABLE_NAME}} ||
|Mesaj|Aktarılacak Alan|Güncellenme Durumu|
--------------------------------------------------
--------------------------------------------------
|{{MSG_NAME}}|{{TARGET_FIELD}}|{{UPDATE_FIELD}}|
--------------------------------------------------
|{{MSG_NAME}}|{{TARGET_FIELD}}|{{UPDATE_FIELD}}|
--------------------------------------------------
...
--------------------------------------------------
Header: {{SOURCE_PARTITION}} Bölüntüsünden Alınan İlgili Verilerin Telemetri Mesajlarına Aktarılması
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DATA_TRANSFER_LOGIC}}
* {{EXCLUSION_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: Tablo - {{TABLE_NAME}} ||
|Alınacak Alan|Aktarılacak Alan|
--------------------------------------------------
--------------------------------------------------
|{{SOURCE_FIELD}}|{{TARGET_FIELD}}|
--------------------------------------------------
|{{SOURCE_FIELD}}|{{TARGET_FIELD}}|
--------------------------------------------------
...
--------------------------------------------------
Header: {{SOURCE_PARTITION}} Verilerinin Telemetri Mesajlarına Aktarılması
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DATA_TRANSFER_LOGIC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: Tablo - {{TABLE_NAME}} ||
|Alınacak Alan|Aktarılacak Alan|
--------------------------------------------------
--------------------------------------------------
|{{SOURCE_FIELD}}|{{TARGET_FIELD}}|
--------------------------------------------------
...
--------------------------------------------------
Header: Telekomuttan Alınan İlgili Verilerin Telemetri Mesajlarına Aktarılması
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DATA_TRANSFER_LOGIC}}
Not: {{MSG_SENDING_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: Tablo - {{TABLE_NAME}} ||
|Alınacak Alan|Aktarılacak Alan|
--------------------------------------------------
--------------------------------------------------
|{{SOURCE_FIELD}}|{{TARGET_FIELD}}|
--------------------------------------------------
...
--------------------------------------------------
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{ROUNDING_NOTE}}
round işlemi için {{REF_DOC}} {{REF_REQ}} nolu açıklamaya bakınız. ||
Header: Telemetri Mesajlarının Gönderilmesi
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TIMING_TABLE_DESC}}
Not1: {{REDUNDANCY_NOTE}}
Not2: {{APERIODIC_NOTE}}
Not3: {{START_TIME_NOTE}}
Not4: {{LOOP_NOTE}}
Not5: {{MSG_SENDING_NOTE}}
Not6: {{DUAL_LINK_NOTE}}
Tablo - Mesaj Zamanları
Mesaj Zamanı Periyot (Döngü) Offset (Döngü) Gönderilmeyecek Mesajlar Gönderilecek Mesajlar
{{TIME_SLOT_1}} {{PERIOD_1}} {{OFFSET_1}} {{SKIP_MSGS_1}} {{SEND_MSGS_1}}
{{TIME_SLOT_2}} {{PERIOD_2}} {{OFFSET_2}} {{SKIP_MSGS_2}} {{SEND_MSGS_2}}
...
||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: Tablo - Mesaj Zamanlama Grafiği
    {{COLUMNS}}
0 {{ROW_0}}
1 {{ROW_1}}
...
||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FRAME_STRUCTURE_DESC}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim:
Şekil 1 - {{FIGURE_TITLE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HEADER_FILLING_LOGIC}}
a) {{FIELD_1}}
b) {{FIELD_2}}
...
f) {{FIELD_6}}
Not: {{MSG_ID_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{CRC_CALCULATION_DESC}}
{{CRC_CODE_BLOCK}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DATA_STRUCTURE_FILLING_LOGIC}}
a) {{FIELD_1}}
b) {{FIELD_2}}
c) {{FIELD_3}}
Not-1: {{INDEX_NOTE_1}}
Not-2: {{INDEX_NOTE_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INSTANCE_RESET_LOGIC}}
Not1: {{PRIORITY_NOTE}}
Not2: {{MSG_ID_NOTE}} ||
Header: Link Seçimi
Header: LinkOwner
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_AUTO_CONDITION}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_NO_LINK_CONDITION}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_FORCED_LOS_1_VALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_FORCED_LOS_1_INVALID_LOS2_VALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_FORCED_LOS_1_INVALID_LOS2_INVALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_FORCED_LOS_2_VALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_FORCED_LOS_2_INVALID_LOS1_VALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_FORCED_LOS_2_INVALID_LOS1_INVALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_BLOS_1_VALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_BLOS_1_INVALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_OWNER_BLOS_2_INVALID}}
a) {{ACTION_1}}
b) {{ACTION_2}} ||
Header: LinkValidity
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FLIGHT_MODE_HOLD_CONDITION}}
a) {{TIMEOUT_1}}
b) {{TIMEOUT_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FLIGHT_MODE_TAXI_CONDITION}}
a) {{TIMEOUT_1}}
b) {{TIMEOUT_2}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FLIGHT_MODE_NAV_CONDITION_1}}
{{TIMEOUT_1}} değeri {{THRESHOLD_1}} değerinden büyük ise,
{{INTERNAL_FIELD}} = {{TIMEOUT_1}} * {{MULTIPLIER}} değerini yoksa
{{DEFAULT_1}} değerini atayacaktır.
{{TIMEOUT_2}} değeri {{THRESHOLD_2}} değerinden büyük ise,
{{INTERNAL_FIELD}} = {{TIMEOUT_2}} * {{MULTIPLIER}} değerini yoksa
{{DEFAULT_2}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FLIGHT_MODE_NAV_CONDITION_2}}
{{TIMEOUT_1}} değeri {{THRESHOLD_1}} değerinden büyük ise,
{{INTERNAL_FIELD}} = {{TIMEOUT_1}} * {{MULTIPLIER}} değerini yoksa
{{DEFAULT_1}} değerini atayacaktır.
{{TIMEOUT_2}} değeri {{THRESHOLD_2}} değerinden büyük ise,
{{INTERNAL_FIELD}} = {{TIMEOUT_2}} * {{MULTIPLIER}} değerini yoksa
{{DEFAULT_2}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_TIMEOUT_INVALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{DIFF_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_TIMEOUT_VALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{DIFF_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_NAV_INVALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
c) {{CONDITION_3}}
d) {{CONDITION_4}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{RESTART_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_NAV_VALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
c) {{CONDITION_3}}
d) {{TIMEOUT_CONDITION}}
e) {{STATUS_CONDITION}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_TIMEOUT_INVALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{DIFF_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_TIMEOUT_VALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{DIFF_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_NAV_INVALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
c) {{CONDITION_3}}
d) {{CONDITION_4}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{RESTART_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_NAV_VALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
c) {{CONDITION_3}}
d) {{TIMEOUT_CONDITION}}
e) {{STATUS_CONDITION}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_TIMEOUT_INVALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{DIFF_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_TIMEOUT_VALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır.
Not: {{DIFF_NOTE}} ||
Header: Link Validity Mismatch
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{PROCESS_SUCCESS_CONDITION}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
Header: LinkMismatch
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MISMATCH_TRUE_CONDITION}}
{{TIMEOUT}} saniye boyunca {{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır.
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MISMATCH_FALSE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MISMATCH_TRUE_CONDITION}}
{{TIMEOUT}} saniye boyunca {{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır.
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MISMATCH_FALSE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MISMATCH_TRUE_CONDITION}}
{{TIMEOUT}} saniye boyunca {{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır.
Not: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MISMATCH_FALSE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
Header: Link Validity Mismatch
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{VALIDITY_MISMATCH_TRUE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{VALIDITY_MISMATCH_FALSE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{VALIDITY_MISMATCH_TRUE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{VALIDITY_MISMATCH_FALSE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{VALIDITY_MISMATCH_TRUE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{VALIDITY_MISMATCH_FALSE_CONDITION}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
Header: AGM Atamaları
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{INTERNAL_FIELD_MAPPING}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COMPOSITE_MAPPING_AND_CALCULATION}}
a) {{ACTION_1}}
b) {{ACTION_2}}
||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{AGM_ASSIGNMENT_TABLE}}
Not: {{DELAY_NOTE}}
|AGM Mesaj Alanları|{{SOURCE_MODULE}} Mesaj Alanları|
--------------------------------------------------
--------------------------------------------------
... (AGM field rows)
--------------------------------------------------
Header: Handover
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{HANDOVER_SUCCESS_GLOBAL}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
c) {{CONDITION_3}}
aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}}
e) {{ACTION_5}}
f) {{ACTION_6}}
g) {{ACTION_7}}
Not1: {{PRIORITY_NOTE_1}}
Not2: {{DELAY_NOTE}} ||
Header: LOS Handover
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LOS_HANDOVER_SUCCESS}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}}
e) {{ACTION_5}}
f) {{ACTION_6}}
g) {{ACTION_7}}
h) {{ACTION_8}}
i) {{ACTION_9}}
Not1: {{RESTART_NOTE}}
Not2: {{RESET_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LOS_HANDOVER_FAIL_LOW_QUALITY}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
"a" şıkkındaki koşul sağlandıktan {{TIMEOUT}} sonra aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LOS_HANDOVER_FAIL_NO_PACKETS}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}} ||
Header: BLOS Handover
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{BLOS_HANDOVER_SUCCESS}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}}
e) {{ACTION_5}}
f) {{ACTION_6}}
g) {{ACTION_7}}
h) {{ACTION_8}}
i) {{ACTION_9}}
Not1: {{RESTART_NOTE}}
Not2: {{RESET_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{BLOS_HANDOVER_FAIL_NO_PACKETS}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
"a" şıkkındaki koşul sağlandıktan {{TIMEOUT}} sonra aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}} ||
Header: Force Handover
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FORCE_HANDOVER_SUCCESS}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}}
e) {{ACTION_5}}
f) {{ACTION_6}}
g) {{ACTION_7}}
h) {{ACTION_8}}
i) {{ACTION_9}}
j) {{ACTION_10}}
k) {{ACTION_11}}
Not1: {{RESTART_NOTE}}
Not2: {{RESET_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{FORCE_HANDOVER_FAIL_NO_PACKETS}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
aşağıdaki işlemleri sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{DELAY_COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{NVRAM_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{GCSID_TYPE_GLOBAL}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{VALUE}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{GCSID_TYPE_NVRAM}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{VALUE}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_ANY}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{LINK_VALIDITY_ALL}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
{{INTERNAL_FIELD}} alanına {{STATUS_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TC_USED_PRIORITY_1}}
Not1: {{DEFAULT_NOTE}}
Not2: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TC_USED_PRIORITY_2}}
Not1: {{DEFAULT_NOTE}}
Not2: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TC_USED_PRIORITY_3}}
Not1: {{DEFAULT_NOTE}}
Not2: {{PRIORITY_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{TC_USED_PRIORITY_4}}
Not: {{DEFAULT_NOTE}} ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{UPLINK_EXISTS_ALL_INVALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
c) {{CONDITION_3}}
d) {{CONDITION_4}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{UPLINK_EXISTS_ANY_VALID}}
a) {{CONDITION_1}}
b) {{CONDITION_2}}
c) {{CONDITION_3}}
d) {{CONDITION_4}}
{{INTERNAL_FIELD}} alanına {{BOOL_VALUE}} atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{GLOBAL_COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{GLOBAL_COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{GLOBAL_COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{QUALITY_MAPPING}}
{{INTERNAL_FIELD}} değerini atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{SNR_CALCULATION}}
{{INTERNAL_FIELD}} değerini matematiksel yuvarlama işleminden geçirip {{RANGE}} arasına limitleyelek atayacaktır. ||
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{MODE_CODE_MAPPING}}
{{FIELD_1}} {{FIELD_2}}
{{VALUE_1}} {{VALUE_2}}
...
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{COUNTER_MAPPING}}
sırayla yapacaktır:
a) {{ACTION_1}}
b) {{ACTION_2}}
c) {{ACTION_3}}
d) {{ACTION_4}} ||
Header: Blok Tipi
|| Gereksinim No:{{REQ_ID}} || Gereksinim: {{BLOCK_TYPE_ASSIGNMENT}}
{{INTERNAL_FIELD}} alanına {{VALUE}} değerini atayacaktır. ||
Header: GİRDİ/ÇIKTI TABLOLARI
Table Type: MESSAGE
Table Name or Description: Internal
Table: Internal
|Name|Unit|Range|Default Value|AGM Alanı|Referenced Type|
--------------------------------------------------
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}} ({{NOTE}})||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}} ({{NOTE}})||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}} ({{NOTE}})||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}} ({{NOTE}})||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}} ({{NOTE}})||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}||||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}||||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
... (remaining field rows)
--------------------------------------------------
# Mesaj Alanı
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
|{{FIELD_NAME}}|{{UNIT}}|{{RANGE}}|{{DEFAULT}}|{{AGM_FIELD}}||
--------------------------------------------------
... (50+ additional field rows repeating the same pattern)
--------------------------------------------------
