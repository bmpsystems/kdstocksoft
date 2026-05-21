import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";

// --- Simple Rich Text Toolbar ---
const ToolbarButton = ({ label, action, icon, disabled }) => (
  <button
    type="button"
    onMouseDown={e => {
      e.preventDefault();
      action();
    }}
    style={{
      background: "none",
      border: "none",
      cursor: "pointer",
      fontSize: 18,
      marginRight: 8,
      color: disabled ? "#aaa" : "#28323c"
    }}
    title={label}
    disabled={disabled}
  >
    {icon || label}
  </button>
);

const RichTextEditor = ({
  value,
  onChange,
  disabled,
  placeholder,
  uploadImageHandler
}) => {
  const ref = useRef();
  // Insert HTML at cursor
  const insertAtCaret = html => {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return;
    const range = sel.getRangeAt(0);
    const el = document.createElement("div");
    el.innerHTML = html;
    const frag = document.createDocumentFragment();
    let node, lastNode;
    while ((node = el.firstChild)) {
      lastNode = frag.appendChild(node);
    }
    range.deleteContents();
    range.insertNode(frag);
    // Move caret after inserted node
    if (lastNode) {
      range.setStartAfter(lastNode);
      range.collapse(true);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  };

  // Format commands
  const format = cmd => document.execCommand(cmd, false, null);
  const handleImageUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    // Convert to Base64 (simulate upload), or replace by actual upload logic
    const reader = new FileReader();
    reader.onload = function (evt) {
      uploadImageHandler
        ? uploadImageHandler(evt.target.result)
        : insertAtCaret(`<img src="${evt.target.result}" style="max-width:360px;max-height:200px;border-radius:4px;" alt="IMG" />`);
    };
    reader.readAsDataURL(file);
    e.target.value = ""; // Allow same file twice
  };
  return (
    <div>
      <div
        style={{
          border: "1px solid #bbb",
          borderRadius: "6px 6px 0 0",
          background: "#f6f7fa",
          padding: "8px",
          display: "flex",
          alignItems: "center",
          gap: 2
        }}
      >
        <ToolbarButton
          label="Bold"
          icon={<b>B</b>}
          action={() => format("bold")}
          disabled={disabled}
        />
        <ToolbarButton
          label="Italic"
          icon={<span style={{ fontStyle: "italic" }}>I</span>}
          action={() => format("italic")}
          disabled={disabled}
        />
        <ToolbarButton
          label="Underline"
          icon={<u>U</u>}
          action={() => format("underline")}
          disabled={disabled}
        />
        <ToolbarButton
          label="Bullet List"
          icon={<span>&#8226; List</span>}
          action={() => format("insertUnorderedList")}
          disabled={disabled}
        />
        <ToolbarButton
          label="Numbered List"
          icon={<span>1. List</span>}
          action={() => format("insertOrderedList")}
          disabled={disabled}
        />
        <ToolbarButton
          label="Quote"
          icon={<span>&ldquo;</span>}
          action={() => format("formatBlock", "BLOCKQUOTE")}
          disabled={disabled}
        />
        <ToolbarButton
          label="Insert Link"
          icon={<span>&#128279;</span>}
          action={() => {
            const url = prompt("Enter link URL");
            if (url) document.execCommand("createLink", false, url);
          }}
          disabled={disabled}
        />
        <label htmlFor="img-uploader" style={{ margin: 0 }}>
          <ToolbarButton
            label="Insert Image"
            icon={<span>&#128247;</span>}
            action={() => {}}
            disabled={disabled}
          />
        </label>
        <input
          id="img-uploader"
          type="file"
          style={{ display: "none" }}
          accept="image/*"
          onChange={handleImageUpload}
          disabled={disabled}
        />
      </div>
      <div
        ref={ref}
        style={{
          border: "1px solid #bbb",
          borderTop: "none",
          minHeight: 150,
          background: disabled ? "#f8f8f8" : "#fff",
          padding: 14,
          borderRadius: "0 0 6px 6px",
          fontSize: 16,
          outline: "none",
          transition: "0.15s",
        }}
        tabIndex={0}
        contentEditable={!disabled}
        suppressContentEditableWarning
        dangerouslySetInnerHTML={{ __html: value }}
        onInput={e => onChange(e.currentTarget.innerHTML)}
        placeholder={placeholder}
      />
      {value === "" && (
        <div
          style={{
            position: "absolute",
            color: "#aaa",
            fontFamily: "inherit",
            pointerEvents: "none",
            left: 20,
            top: 88
          }}
        >
          {placeholder}
        </div>
      )}
    </div>
  );
};

// EmailMarketing Page Component
const EmailMarketing = () => {
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [regionOptions, setRegionOptions] = useState([]);
  const [selectedCatId, setSelectedCatId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [selectedRegionId, setSelectedRegionId] = useState("");
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [isSending, setIsSending] = useState(false);

  // Fetch dropdown helpers
  useEffect(() => {
    const fetchHelpers = async () => {
      try {
        const [categoryRes, typeRes, regionRes] = await Promise.all([
          axios.get("http://localhost:5000/category"),
          axios.get("http://localhost:5000/type"),
          axios.get("http://localhost:5000/region"),
        ]);
        setCategoryOptions(categoryRes.data);
        setTypeOptions(typeRes.data);
        setRegionOptions(regionRes.data);
      } catch (err) {
        console.error("❌ Error fetching dropdown helpers:", err);
      }
    };
    fetchHelpers();
  }, []);

  // Fetch all customers (with emails)
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        // Fetch a large result set (pagination optional)
        const res = await axios.get("http://localhost:5000/customer", {
          params: {
            // Empty params returns all by default
          },
        });
        setCustomers(res.data);
      } catch (err) {
        console.error("❌ Error fetching customers:", err);
      }
    };
    fetchCustomers();
  }, []);

  // Filtering based on selection
  useEffect(() => {
    let filtered = customers;

    if (selectedCatId) {
      filtered = filtered.filter(
        (c) =>
          (c.cat_Id?.toString() || c.Cat_Id?.toString() || "") === selectedCatId
      );
    }
    if (selectedTypeId) {
      filtered = filtered.filter(
        (c) =>
          (c.type_Id?.toString() || c.Type_Id?.toString() || "") === selectedTypeId
      );
    }
    if (selectedRegionId) {
      filtered = filtered.filter(
        (c) =>
          (c.region_Id?.toString() || c.Region_Id?.toString() || "") === selectedRegionId
      );
    }

    // Only unique customer emails, in case of duplicates -- collapse by email
    const seenEmails = new Set();
    const unique = [];
    for (const c of filtered) {
      const email = c.emailid || c.emailId || "";
      if (email && !seenEmails.has(email.toLowerCase())) {
        seenEmails.add(email.toLowerCase());
        unique.push(c);
      }
    }

    setFilteredCustomers(unique);
  }, [selectedCatId, selectedTypeId, selectedRegionId, customers]);

  const handleImageInsert = imgSrc => {
    // Insert image at caret or append if not focused
    setEmailBody(body => {
      // You can make this more robust, here we append if not focused
      return `${body}<div><img src="${imgSrc}" style="max-width:360px;max-height:200px;border-radius:4px;" alt="IMG" /></div>`;
    });
  };

  // Local dummy sendEmail handler (simulate actual send, as API not included as per instruction)
  const handleSendBulkEmails = async (e) => {
    e.preventDefault();
    if (!emailSubject.trim() || !emailBody.trim() || emailBody.replace(/<(.|\n)*?>/g, '').trim() === "") {
      Swal.fire("Error", "Both Subject and Body are required.", "warning");
      return;
    }
    if (filteredCustomers.length === 0) {
      Swal.fire("No recipients", "No customers found for the selected filters.", "info");
      return;
    }
    setIsSending(true);

    try {
      // Show a preview of send operation
      await Swal.fire({
        icon: "info",
        title: "Preview",
        html: `<b>Subject:</b> ${emailSubject}<br/>
          <b>Body:</b><br/>
          <div style="text-align:left;white-space:pre-wrap;background:#eef;padding:8px;border-radius:6px;">${emailBody}</div>
          <b>Total Recipients:</b> ${filteredCustomers.length}<br/>
          <div style="max-height:150px;overflow:auto;text-align:left"><ul style="padding-left:20px;">${filteredCustomers
            .map(
              (c) =>
                `<li>${(c.Company || c.company_name) ?? ""} &lt;${c.emailid || c.emailId}&gt;</li>`
            )
            .join("")}</ul></div>
          <i>Emails will be sent in bulk via backend (simulated).</i>
          `,
        showCancelButton: true,
        confirmButtonText: "Send Emails",
        cancelButtonText: "Cancel",
        width: 700
      });

      // Simulate success
      setTimeout(() => {
        setIsSending(false);
        Swal.fire(
          "Success",
          `${filteredCustomers.length} emails have been (simulated) sent!`,
          "success"
        );
        setEmailSubject("");
        setEmailBody("");
      }, 1500);
    } catch (err) {
      setIsSending(false);
      console.error("❌ Error in simulated send:", err);
      Swal.fire("Failed", "There was an error sending emails.", "error");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(120deg, #e3ffe5 0%, #f8fcff 100%)",
        display: "flex",
        flexDirection: "column",
        margin: 0,
        padding: 0
      }}
    >
      <div
        style={{
          width: "100%",
          background: "linear-gradient(to right, #2C3E50, #4ca1af)",
          padding: "32px 0 32px 0",
          marginBottom: 0
        }}
      >
        <h1
          style={{
            textAlign: "center",
            fontWeight: "bold",
            color: "#fff",
            fontSize: 40,
            letterSpacing: 2,
            margin: 0,
            textShadow: "1px 3px 12px rgba(0,0,0,0.14)",
          }}
        >
          Email Marketing Campaign
        </h1>
        <p style={{ color: "#e3efff", textAlign: "center", margin: "6px 0 0 0", fontSize: 18 }}>
          {/* Select Category, Type, and Region to target your customers effectively. */}
        </p>
      </div>
      <form
        style={{
          width: "calc(100vw - 40px)",
          maxWidth: 1400,
          margin: "-40px auto 0 auto",
          background: "#fff",
          borderRadius: "18px",
          boxShadow: "0 8px 48px 4px rgba(44,79,180,0.07)",
          padding: "40px 38px 34px 38px",
          display: "flex",
          flexDirection: "column",
          gap: 22,
          minHeight: 420
        }}
        onSubmit={handleSendBulkEmails}
      >
        <div style={{ display: "flex", flexWrap: "wrap", gap: "30px 38px" }}>
          <div style={{ minWidth: 240, flex: 1 }}>
            <label style={labelStyle}>Category</label>
            <select
              value={selectedCatId}
              onChange={(e) => setSelectedCatId(e.target.value)}
              style={inputStyle}
              disabled={isSending}
            >
              <option value="">All</option>
              {categoryOptions.map((opt) => (
                <option key={opt.Id} value={opt.Id}>
                  {opt.Category}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 240, flex: 1 }}>
            <label style={labelStyle}>Type</label>
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              style={inputStyle}
              disabled={isSending}
            >
              <option value="">All</option>
              {typeOptions.map((opt) => (
                <option key={opt.Id} value={opt.Id}>
                  {opt.Type}
                </option>
              ))}
            </select>
          </div>
          <div style={{ minWidth: 240, flex: 1 }}>
            <label style={labelStyle}>Region</label>
            <select
              value={selectedRegionId}
              onChange={(e) => setSelectedRegionId(e.target.value)}
              style={inputStyle}
              disabled={isSending}
            >
              <option value="">All</option>
              {regionOptions.map((opt) => (
                <option key={opt.Id} value={opt.Id}>
                  {opt.Region}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 40, flexWrap: "wrap", marginTop: 20 }}>
          <div style={{ flex: 2, minWidth: 340 }}>
            <label style={labelStyle}>Email Subject</label>
            <input
              type="text"
              style={{
                ...inputStyle,
                fontWeight: 500,
                fontSize: 18,
                background: "#f7fbff",
              }}
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              required
              placeholder="Enter the email subject"
              disabled={isSending}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "row", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: 2, minWidth: 330, position: "relative" }}>
            <label style={labelStyle}>Email Body</label>
            <RichTextEditor
              value={emailBody}
              onChange={setEmailBody}
              disabled={isSending}
              placeholder="Write your message here. Format text, insert images and links!"
              uploadImageHandler={handleImageInsert}
            />
            <div style={{ color: "#adadad", fontSize: 13, marginTop: 8 }}>
              Rich formatting and inline images supported!
            </div>
          </div>
          <div style={{
            flex: 1,
            minWidth: 250,
            marginTop: 11,
            background: "#f6f8fa",
            border: "1px solid #e4e7ee",
            borderRadius: 8,
            boxShadow: "0 2px 8px rgba(54,64,104,0.03)",
            padding: "23px 19px 15px 19px",
            position: "relative",
            maxHeight: 270
          }}>
            <b style={{ fontWeight: 600, fontSize: 18, color: "#2C3E50" }}>Recipients</b>
            <div style={{ margin: "10px 0 0 0", fontSize: 15, color: "#52607c" }}>
              {filteredCustomers.length} customer{filteredCustomers.length !== 1 ? "s" : ""} selected.
              <button
                type="button"
                style={{
                  marginLeft: 10,
                  background: "none",
                  color: "#2C3E50",
                  border: "none",
                  cursor: filteredCustomers.length === 0 ? "not-allowed" : "pointer",
                  textDecoration: filteredCustomers.length === 0 ? "none" : "underline",
                  fontSize: 15,
                  fontWeight: 500,
                  opacity: filteredCustomers.length === 0 ? 0.6 : 1,
                }}
                onClick={() =>
                  filteredCustomers.length > 0 && Swal.fire({
                    title: "Recipient Preview",
                    html:
                      "<div style='max-height:250px;overflow:auto;text-align:left'><ol style='padding-left:20px'>" +
                        filteredCustomers
                          .map(
                            (c) =>
                              `<li>${(c.Company || c.company_name) ?? ""} &lt;${c.emailid || c.emailId}&gt;</li>`
                          )
                          .join("") +
                        "</ol></div>",
                    confirmButtonText: "OK",
                    width: 580,
                  })
                }
                tabIndex="-1"
                disabled={filteredCustomers.length === 0}
              >
                Show Recipients
              </button>
            </div>
            <div style={{ marginTop: 13, fontSize: 14, color: "#9db4c7" }}>
              Filters can reduce the recipient list.
            </div>
          </div>
        </div>
        <div style={{ marginTop: 26, textAlign: "right" }}>
          <button
            type="submit"
            disabled={
              isSending ||
              !emailSubject.trim() ||
              !emailBody.trim() ||
              emailBody.replace(/<(.|\n)*?>/g, '').trim() === "" ||
              filteredCustomers.length === 0
            }
            style={{
              ...buttonStyle,
              opacity: isSending ? 0.6 : 1,
              pointerEvents: isSending ? "none" : "initial",
            }}
          >
            {isSending
              ? <>
                  <span className="loader" style={{
                    marginRight: 10,
                    verticalAlign: "middle",
                    border: "2.5px solid #f3f3f3",
                    borderTop: "2.5px solid #3498db",
                    borderRadius: "100%",
                    width: "18px",
                    height: "18px",
                    display: "inline-block",
                    animation: "spin 1.2s linear infinite"
                  }} />
                  Sending...
                </>
              : `Send Email (${filteredCustomers.length})`}
          </button>
        </div>
      </form>
      {/* Loader keyframes */}
      <style>
        {`@keyframes spin{0%{transform:rotate(0deg);}100%{transform:rotate(360deg);}}`}
      </style>
      <footer style={{
        marginTop: 32,
        textAlign: "center",
        color: "#8ca9bd",
        fontSize: "14.5px",
        paddingBottom: 24,
        paddingTop: 24,
        letterSpacing: 0.1
      }}>
        &copy; {new Date().getFullYear()} Email Marketing Platform. Design with <span style={{ color: "#f25a72" }}>&hearts;</span>
      </footer>
    </div>
  );
};

const inputStyle = {
  width: "100%",
  padding: "13px 12px",
  marginBottom: 0,
  borderRadius: "6px",
  border: "1.5px solid #dbe9fa",
  background: "#f4faff",
  fontSize: 17,
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  transition: "0.17s border"
};
const labelStyle = {
  marginBottom: 8,
  marginTop: 4,
  display: "block",
  color: "#2C3E50",
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: 0.2,
};
const buttonStyle = {
  padding: "13px 38px",
  background: "linear-gradient(105deg, #4183c4 10%, #2C3E50 90%)",
  color: "#fff",
  border: "none",
  borderRadius: "6px",
  fontSize: 18,
  fontWeight: 700,
  cursor: "pointer",
  textShadow: "0px 1px 2px rgba(0,0,0,0.1)",
  transition: "0.18s"
};

export default EmailMarketing;
