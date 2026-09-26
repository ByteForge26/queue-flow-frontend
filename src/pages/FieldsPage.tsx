import {
  useCallback,
  useEffect,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";

import { Link, useParams } from "react-router-dom";

import { Button, Card, Spinner } from "../components/ui";
import { useT } from "../i18n/LanguageContext";

import {
  getFields,
  getPlatformConfig,
  addField,
  updateField,
  setFieldActive,
  deleteField,
} from "../lib/api";

import type {
  FormFieldDto,
  FieldTypeName,
} from "../lib/types";


// ------------------------------------------------------------
// Supported field types
// ------------------------------------------------------------

// Supported field types jo admin select kar sakta hai
// naya field banate waqt.
//
// TEXT      = single line text
// MULTILINE = paragraph / multiple lines
// NUMBER    = sirf numbers
// PHONE     = phone number format
const TYPES: FieldTypeName[] = [
  "TEXT",
  "MULTILINE",
  "NUMBER",
  "PHONE",
];


// ------------------------------------------------------------
// Protected fields
// ------------------------------------------------------------

// Ye fields "protected" hain.
//
// In fields ko delete nahi kar sakte aur type/required
// change nahi kar sakte.
//
// "name" aur "phone" queue form ke core fields hain,
// isliye system inhe protect karta hai.
const PROTECTED: string[] = [
  "name",
  "phone",
];


export default function FieldsPage(): JSX.Element {

  // ----------------------------------------------------------
  // URL params
  // ----------------------------------------------------------

  // URL se shopCode aur sectionCode nikalte hain.
  //
  // shopCode:
  // Dashboard par back jaane ke liye use hota hai.
  //
  // sectionCode:
  // Yahi section hai jiske fields hum manage kar rahe hain.
  const {
    shopCode = "",
    sectionCode = "",
  } = useParams();


  // ----------------------------------------------------------
  // Translation
  // ----------------------------------------------------------

  // UI text ko current language mein convert karta hai.
//   const { t } = useT();
    const t = useT();


  // ----------------------------------------------------------
  // Fields state
  // ----------------------------------------------------------

  // Server se fetch kiye gaye fields ki list.
  //
  // Har FormFieldDto mein normally:
  // id, label, type, required, active, key etc. hote hain.
  const [fields, setFields] = useState<FormFieldDto[]>([]);


  // Data load ho raha hai ya nahi.
  //
  // true hone par Spinner dikhaya jaayega.
  const [loading, setLoading] = useState(true);


  // Koi API error aaye to uska message yahan store hota hai.
  //
  // null = koi error nahi.
  const [error, setError] = useState<string | null>(null);


  // ----------------------------------------------------------
  // Platform configuration
  // ----------------------------------------------------------

  // Platform config se pata chalta hai ki custom fields
  // feature enabled hai ya nahi.
  //
  // false hone par "Add New Field" section hide ho jaata hai
  // aur shop admin naye fields create nahi kar sakta.
  const [
    customFieldsEnabled,
    setCustomFieldsEnabled,
  ] = useState(true);


  // ==========================================================
  // NAYA FIELD ADD KARNE KE LIYE STATE
  // ==========================================================

  // Naye field ka label/display name.
  const [label, setLabel] = useState("");


  // Naye field ka type.
  //
  // Dropdown se bind hai.
  const [type, setType] = useState<FieldTypeName>("TEXT");


  // Naya field required hai ya optional.
  //
  // Checkbox se bind hai.
  const [required, setRequired] = useState(false);


  // ==========================================================
  // EXISTING FIELD EDIT KARNE KE LIYE STATE
  // ==========================================================

  // Abhi kaun sa field edit ho raha hai uska ID.
  //
  // null = koi field edit mode mein nahi hai.
  const [editId, setEditId] = useState<number | null>(null);


  // Edit mode mein field ka updated label.
  const [eLabel, setELabel] = useState("");


  // Edit mode mein field ka updated type.
  const [eType, setEType] = useState<FieldTypeName>("TEXT");


  // Edit mode mein field required hai ya nahi.
  const [eRequired, setERequired] = useState(false);


  // ==========================================================
  // REFRESH
  // ==========================================================

  // Ek baar mein fields + platform config fetch karta hai.
  //
  // useCallback isliye use kiya hai taaki sectionCode change
  // hone par hi naya function bane.
  const refresh = useCallback((): void => {

    Promise.all([
      getFields(sectionCode),
      getPlatformConfig(),
    ])
      .then(([fieldData, config]) => {

        // Server se aaye fields state mein save karo.
        setFields(fieldData);

        // Platform config ke according custom fields enabled
        // ya disabled set karo.
        setCustomFieldsEnabled(
          config.customFieldsEnabled
        );

        // Previous error clear karo.
        setError(null);
      })
      .catch(() => {
        setError(t("fields.loadFailed"));
      })
      .finally(() => {
        setLoading(false);
      });

  }, [sectionCode, t]);


  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  // Component mount hone par ya sectionCode change hone par
  // fresh data fetch hota hai.
  useEffect(() => {
    refresh();
  }, [refresh]);


  // ==========================================================
  // ADD FIELD
  // ==========================================================

  // Naya field API ke through create karta hai.
  async function add(): Promise<void> {

    // Previous error clear karo.
    setError(null);

    try {

      // trim() isliye kiya hai taaki sirf whitespace wala
      // label submit na ho.
      await addField(sectionCode, {
        label: label.trim(),
        type,
        required,
      });


      // Form reset karo.
      // Next field ke liye clean slate milega.
      setLabel("");
      setType("TEXT");
      setRequired(false);


      // Latest fields fetch karo.
      refresh();

    } catch {
      setError(t("fields.addFailed"));
    }
  }


  // ==========================================================
  // START EDIT
  // ==========================================================

  // User kisi field ke "Edit" button par click kare toh
  // us field ki current values edit state mein copy hoti hain.
  //
  // Isse inline edit form pre-filled dikhta hai.
  function startEdit(f: FormFieldDto): void {

    setEditId(f.id);

    setELabel(f.label);

    setEType(f.type);

    setERequired(f.required);
  }


  // ==========================================================
  // SAVE EDIT
  // ==========================================================

  // Edit mode mein ki gayi changes API ke through save karta hai.
  async function saveEdit(): Promise<void> {

    // Safety guard.
    //
    // Agar editId nahi hai toh kuch mat karo.
    if (editId == null) return;


    // Previous error clear karo.
    setError(null);


    try {

      await updateField(editId, {
        label: eLabel.trim(),
        type: eType,
        required: eRequired,
      });


      // Edit mode band karo.
      setEditId(null);


      // Fresh data load karo.
      refresh();

    } catch {
      setError(t("fields.updateFailed"));
    }
  }


  // ==========================================================
  // TOGGLE ACTIVE / INACTIVE
  // ==========================================================

  // Field ko active/inactive toggle karta hai.
  //
  // f.active ka current state ulta bheja jaata hai API ko.
  //
  // Protected fields ke liye bhi Edit button available hai,
  // lekin protected field ko disable karne ki koshish par
  // server error return kar sakta hai.
  async function toggle(f: FormFieldDto): Promise<void> {

    setError(null);

    try {

      await setFieldActive(
        f.id,
        !f.active
      );

      refresh();

    } catch {

      setError(
        t("fields.protectedDisable", {
          name: f.label,
        })
      );
    }
  }


  // ==========================================================
  // DELETE FIELD
  // ==========================================================

  // Field ko permanently delete karta hai.
  //
  // Protected fields ke liye Delete button render hi nahi hota.
  //
  // Agar kisi edge case mein server delete reject kare,
  // toh error message show hota hai.
  async function remove(f: FormFieldDto): Promise<void> {

    setError(null);

    try {

      await deleteField(f.id);

      refresh();

    } catch {

      setError(
        t("fields.protectedDelete", {
          name: f.label,
        })
      );
    }
  }


  // ==========================================================
  // LOADING
  // ==========================================================

  // Agar data abhi load ho raha hai toh poore page ki jagah
  // sirf Spinner dikhao.
  //
  // Ye early return pattern hai.
  if (loading) {
    return <Spinner />;
  }


  // ==========================================================
  // PAGE JSX
  // ==========================================================

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">

      {/* ------------------------------------------------------
          PAGE HEADER
      ------------------------------------------------------ */}

      <div className="mb-5">

        {/* Dashboard par wapas jaane ka Link.
            shopCode use karke correct URL banta hai. */}
        <Link
          to={`/admin/${shopCode}`}
          className="text-sm text-brand hover:underline"
        >
          {t("common.backDashboard")}
        </Link>


        {/* Main heading.
            sectionCode title mein context ke liye dikhaya gaya hai. */}
        <h1 className="text-2xl font-bold mt-1">
          {t("fields.title", {
            section: sectionCode,
          })}
        </h1>


        {/* Subtitle */}
        <p className="text-gray-500 text-sm">
          {t("fields.subtitle")}
        </p>

      </div>


      {/* ------------------------------------------------------
          ERROR MESSAGE
      ------------------------------------------------------ */}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}


      {/* ------------------------------------------------------
          ADD NEW FIELD FORM
      ------------------------------------------------------ */}

      {/* Platform admin ne agar custom fields disable kiye hain
          toh ye poora section hide ho jaata hai. */}
      {customFieldsEnabled && (

        <Card className="mb-5">

          <h2 className="font-semibold mb-3">
            {t("fields.newField")}
          </h2>


          {/* Label input + Type dropdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">

            {/* ------------------------------------------------
                LABEL INPUT
            ------------------------------------------------ */}

            <input
              value={label}
              placeholder={t("fields.label")}
              onChange={(
                e: ChangeEvent<HTMLInputElement>
              ): void =>
                setLabel(e.target.value)
              }
              className="sm:col-span-2 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            />


            {/* ------------------------------------------------
                TYPE DROPDOWN
            ------------------------------------------------ */}

            <select
              value={type}
              onChange={(
                e: ChangeEvent<HTMLSelectElement>
              ): void =>
                setType(
                  e.target.value as FieldTypeName
                )
              }
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/40"
            >

              {TYPES.map(
                (ty: FieldTypeName): JSX.Element => (
                  <option
                    key={ty}
                    value={ty}
                  >
                    {ty === "MULTILINE"
                      ? t("fields.multiline")
                      : ty}
                  </option>
                )
              )}

            </select>

          </div>


          {/* ------------------------------------------------
              REQUIRED CHECKBOX
          ------------------------------------------------ */}

          <label className="flex items-center gap-2 mt-2 text-sm text-gray-600">

            <input
              type="checkbox"
              checked={required}
              onChange={(
                e: ChangeEvent<HTMLInputElement>
              ): void =>
                setRequired(e.target.checked)
              }
            />

            {t("fields.required")}

          </label>


          {/* ------------------------------------------------
              ADD BUTTON
          ------------------------------------------------ */}

          {/* Label empty hone par button disabled rahega.
              Blank label wala field add nahi ho sakta. */}
          <Button
            onClick={add}
            disabled={!label.trim()}
            className="mt-3 w-full"
          >
            {t("fields.addBtn")}
          </Button>

        </Card>
      )}


      {/* ------------------------------------------------------
          FIELDS LIST
      ------------------------------------------------------ */}

      <div className="space-y-2">

        {fields.map(
          (f: FormFieldDto): JSX.Element => {

            // Check karo ki field protected hai ya nahi.
            //
            // Protected fields:
            // name
            // phone
            const isProtected: boolean =
              PROTECTED.includes(f.key);


            return (
              <Card
                key={f.id}
                className={
                  f.active
                    ? ""
                    : "opacity-60"
                }
              >

                {/* ------------------------------------------------
                    EDIT MODE
                ------------------------------------------------ */}

                {editId === f.id ? (

                  <div>

                    {/* --------------------------------------------
                        EDIT LABEL
                    -------------------------------------------- */}

                    <input
                      value={eLabel}
                      onChange={(
                        e: ChangeEvent<HTMLInputElement>
                      ): void =>
                        setELabel(e.target.value)
                      }
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                    />


                    {/* --------------------------------------------
                        EDIT TYPE + REQUIRED
                    -------------------------------------------- */}

                    <div className="flex gap-2 mt-2">

                      {/* Type dropdown.

                          Protected fields ke liye disabled hai.
                          Example:
                          "name" field TEXT se PHONE nahi ban sakta. */}
                      <select
                        value={eType}
                        disabled={isProtected}
                        onChange={(
                          e: ChangeEvent<HTMLSelectElement>
                        ): void =>
                          setEType(
                            e.target.value as FieldTypeName
                          )
                        }
                        className="border border-gray-200 rounded-xl px-3 py-2 text-sm disabled:opacity-50"
                      >

                        {TYPES.map(
                          (
                            ty: FieldTypeName
                          ): JSX.Element => (
                            <option
                              key={ty}
                              value={ty}
                            >
                              {ty === "MULTILINE"
                                ? t("fields.multiline")
                                : ty}
                            </option>
                          )
                        )}

                      </select>


                      {/* Required checkbox.

                          Protected fields ke liye disabled hai,
                          kyunki name aur phone hamesha required
                          system fields hain. */}
                      <label className="flex items-center gap-2 text-sm text-gray-600">

                        <input
                          type="checkbox"
                          checked={eRequired}
                          disabled={isProtected}
                          onChange={(
                            e: ChangeEvent<HTMLInputElement>
                          ): void =>
                            setERequired(
                              e.target.checked
                            )
                          }
                        />

                        {t("common.required")}

                      </label>

                    </div>


                    {/* --------------------------------------------
                        EDIT ACTION BUTTONS
                    -------------------------------------------- */}

                    <div className="flex gap-2 justify-end mt-3">

                      {/* Cancel:
                          editId null set karke edit mode band karo. */}
                      <Button
                        variant="ghost"
                        onClick={() =>
                          setEditId(null)
                        }
                      >
                        {t("common.cancel")}
                      </Button>


                      {/* Save:
                          blank label hone par disabled. */}
                      <Button
                        onClick={saveEdit}
                        disabled={!eLabel.trim()}
                      >
                        {t("common.save")}
                      </Button>

                    </div>

                  </div>

                ) : (

                  /* ------------------------------------------------
                     NORMAL / READ-ONLY MODE
                  ------------------------------------------------ */

                  <div className="flex items-center justify-between">

                    {/* --------------------------------------------
                        LEFT SIDE
                    -------------------------------------------- */}

                    <div>

                      <div className="font-medium">

                        {/* Field label */}
                        {f.label}


                        {/* Required indicator */}
                        {f.required && (
                          <span className="text-xs text-red-500 ml-1">
                            *
                          </span>
                        )}


                        {/* Inactive field tag */}
                        {!f.active && (
                          <span className="text-xs text-gray-400 ml-2">
                            {t("fields.disabledTag")}
                          </span>
                        )}


                        {/* Protected field tag */}
                        {isProtected && (
                          <span className="text-xs text-gray-400 ml-2">
                            {t("fields.requiredTag")}
                          </span>
                        )}

                      </div>


                      {/* ------------------------------------------
                          FIELD TYPE
                      ------------------------------------------ */}

                      <div className="text-xs text-gray-400">

                        {f.type === "MULTILINE"
                          ? t("fields.multiline")
                          : f.type}

                      </div>

                    </div>


                    {/* --------------------------------------------
                        RIGHT SIDE ACTIONS
                    -------------------------------------------- */}

                    <div className="flex items-center gap-3 text-sm">

                      {/* Edit button:
                          Saare fields ke liye available. */}
                      <button
                        onClick={() =>
                          startEdit(f)
                        }
                        className="text-brand hover:underline"
                      >
                        {t("common.edit")}
                      </button>


                      {/* ------------------------------------------------
                          NON-PROTECTED FIELD ACTIONS
                      ------------------------------------------------ */}

                      {/* Protected fields (name, phone) ko
                          disable ya delete nahi kar sakte.

                          Isliye ye dono buttons sirf non-protected
                          fields ke liye render hote hain. */}
                      {!isProtected && (
                        <>
                          {/* Toggle button:
                              Active -> Disable
                              Inactive -> Enable */}
                          <button
                            onClick={() =>
                              toggle(f)
                            }
                            className="text-gray-500 hover:underline"
                          >
                            {f.active
                              ? t("common.disable")
                              : t("common.enable")}
                          </button>


                          {/* Delete button:
                              destructive action hai,
                              isliye red color. */}
                          <button
                            onClick={() =>
                              remove(f)
                            }
                            className="text-red-400 hover:text-red-600"
                          >
                            {t("common.delete")}
                          </button>
                        </>
                      )}

                    </div>

                  </div>
                )}

              </Card>
            );
          }
        )}

      </div>

    </div>
  );
}