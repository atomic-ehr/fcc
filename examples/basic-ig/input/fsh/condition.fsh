Profile:        MyCondition
Parent:         Condition
Id:             my-condition
Title:          "My Condition"
Description:    "Condition profile written in FSH to show interop with TS-authored resources."

* subject 1..1 MS
* subject only Reference(Patient)
* code 1..1 MS
* code from MyConditionCode (extensible)
* recordedDate 1..1 MS

ValueSet: MyConditionCode
Id:       my-condition-code
Title:    "My Condition Codes"
* include codes from system $SCT
* include codes from system $LOINC
