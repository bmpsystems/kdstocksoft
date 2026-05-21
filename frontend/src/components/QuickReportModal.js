import React, { useState } from "react";
import { Modal, Button, Row, Col, Card, Table, Spinner, Form } from "react-bootstrap";
import { Doughnut } from "react-chartjs-2";

// Helper for Excel export
function exportToExcel(data, filename = "inventory_summary.xlsx") {
  // Minimal Excel export using CSV
  const replacer = (key, value) => (value === null ? "" : value);
  const header = Object.keys(data[0]);
  const csv = [
    header.join(","),
    ...data.map((row) =>
      header
        .map((fieldName) =>
          JSON.stringify(row[fieldName], replacer)
            .replace(/^"|"$/g, "")
            .replace(/,/g, " ") // avoid breaking CSV
        )
        .join(",")
    ),
  ].join("\r\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

const QuickReportModal = ({
  show,
  onHide,
  totalProducts,
  lowStockItems,
  totalInventoryValue,
  donutData,
  minimumStock,
  onViewFullReport,
}) => {
  // State for sub-modals
  const [showLowStockModal, setShowLowStockModal] = useState(false);
  const [showFullReportModal, setShowFullReportModal] = useState(false);
  const [fullReportTab, setFullReportTab] = useState("stock"); // "stock", "stockin", "stockout"
  const [loadingFullReport, setLoadingFullReport] = useState(false);
  const [fullReportData, setFullReportData] = useState({
    stock: [],
    stockin: [],
    stockout: [],
  });

  // Top 5 low stock items
  const topLowStock = minimumStock.slice(0, 5);

  // Fetch data for full report modal
  const fetchFullReportData = async () => {
    setLoadingFullReport(true);
    try {
      // Fetch all three datasets in parallel
      const [stock, stockin, stockout] = await Promise.all([
        fetch("http://localhost:5000/stock-dashboard").then((r) => r.json()),
        fetch("http://localhost:5000/stock-in-dashboard").then((r) => r.json()),
        fetch("http://localhost:5000/stock-out-dashboard").then((r) => r.json()),
      ]);
      setFullReportData({ stock, stockin, stockout });
    } catch (err) {
      alert("Failed to load full report data: " + err.message);
    }
    setLoadingFullReport(false);
  };

  // Handle "View Full Report" click
  const handleViewFullReport = () => {
    setShowFullReportModal(true);
    fetchFullReportData();
  };

  // Handle "Download Summary" click
  const handleDownloadSummary = async () => {
    // Download current stock as summary
    try {
      const stock = await fetch("http://localhost:5000/stock-dashboard").then((r) => r.json());
      if (!stock.length) {
        alert("No stock data to export.");
        return;
      }
      // Pick relevant columns for summary
      const data = stock.map((item) => ({
        "Product Name": item.Product_name,
        "Model No": item.Model_no,
        "Make": item.Make,
        "Quantity": item.Quantity,
        "Unit": item.Unit,
        "Cost Price": item.Cost_Price,
        "Total Value": (Number(item.Quantity) || 0) * (Number(item.Cost_Price) || 0),
      }));
      exportToExcel(data, "stock_summary.csv");
    } catch (err) {
      alert("Failed to download summary: " + err.message);
    }
  };

  // Columns for full report tables
  const columns = {
    stock: [
      { label: "Product Name", key: "Product_name" },
      { label: "Model No", key: "Model_no" },
      { label: "Make", key: "Make" },
      { label: "Quantity", key: "Quantity" },
      { label: "Unit", key: "Unit" },
      { label: "Cost Price", key: "Cost_Price" },
      { label: "Total Value", key: (row) => (Number(row.Quantity) || 0) * (Number(row.Cost_Price) || 0) },
    ],
    stockin: [
      { label: "Product Name", key: "Product_name" },
      { label: "Model No", key: "Model_no" },
      { label: "Make", key: "Make" },
      { label: "Quantity In", key: "Quantity" },
      { label: "Cost Price", key: "Cost_Price" },
      { label: "Purchase Date", key: "Purchase_Date" },
      { label: "Created By", key: "Created_By" },
    ],
    stockout: [
      { label: "Product Name", key: "Product_name" },
      { label: "Model No", key: "Model_no" },
      { label: "Make", key: "Make" },
      { label: "Quantity Out", key: "Quantity" },
      { label: "Cost Price", key: "Cost_Price" },
      { label: "Invoice Date", key: "Invoice_Date" },
      { label: "Created By", key: "Created_By" },
    ],
  };

  return (
    <>
      {/* Main Quick Report Modal */}
      <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
        <Modal.Body style={{ padding: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h3 style={{ fontWeight: 700 }}>Quick Inventory Summary</h3>
            <Button variant="light" onClick={onHide} style={{ fontSize: 24, lineHeight: 1, border: "none" }}>
              &times;
            </Button>
          </div>
          <div style={{ fontSize: 14, color: "#888", marginBottom: 24 }}>
            As of:{" "}
            {(() => {
              const now = new Date();
              const dd = String(now.getDate()).padStart(2, "0");
              const mm = String(now.getMonth() + 1).padStart(2, "0");
              const yyyy = now.getFullYear();
              const time = now.toLocaleTimeString();
              return `${dd}/${mm}/${yyyy} ${time}`;
            })()}
          </div>
          <Row className="mb-4">
            <Col md={4} className="mb-2">
              <Card className="shadow-sm border-0" style={{ background: "#f4f8ff" }}>
                <Card.Body className="text-center">
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#2980f2" }}>
                    {totalProducts.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 16, color: "#222" }}>Total Products</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-2">
              <Card className="shadow-sm border-0" style={{ background: "#fffbe6" }}>
                <Card.Body className="text-center">
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#b59f3b" }}>{lowStockItems}</div>
                  <div style={{ fontSize: 16, color: "#222" }}>Low Stock Items</div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-2">
              <Card className="shadow-sm border-0" style={{ background: "#eafaf1" }}>
                <Card.Body className="text-center">
                  <div style={{ fontSize: 32, fontWeight: 700, color: "#27ae60" }}>
                    ₹{totalInventoryValue.toLocaleString()}
                  </div>
                  <div style={{ fontSize: 16, color: "#222" }}>Total Inventory Value</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
          <Row>
            <Col md={6} className="mb-3">
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, height: "100%" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Stock Distribution</div>
                <Doughnut data={donutData} options={{ plugins: { legend: { position: "bottom" } } }} />
              </div>
            </Col>
            <Col md={6} className="mb-3">
              <div style={{ background: "#fff", borderRadius: 12, padding: 16, height: "100%" }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>Top Low Stock Items</div>
                <Table size="sm" borderless>
                  <tbody>
                    {topLowStock.map((item, idx) => (
                      <tr key={item.Prod_Id}>
                        <td style={{ fontWeight: 500 }}>{item.Model_no}</td>
                        <td style={{ color: "#e74c3c", fontWeight: 700 }}>
                          {/* {item.Quantity} units{" "} */}
                          {item.Quantity} {item.Unit}{" "}
                          {/* <span style={{ color: "#888", fontWeight: 400 }}>(Reorder: {item.Minimum})</span> */}
                          <span style={{ color: "#888", fontWeight: 400 }}>(Reorder: 50)</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div style={{ fontSize: 14, marginTop: 8 }}>
                  <a
                    href="#"
                    style={{ color: "#2980f2", textDecoration: "underline" }}
                    onClick={(e) => {
                      e.preventDefault();
                      setShowLowStockModal(true);
                    }}
                  >
                    View All Low Stock →
                  </a>
                </div>
              </div>
            </Col>
          </Row>
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 16, marginTop: 32 }}>
            <Button variant="primary" onClick={handleViewFullReport}>
              View Full Report
            </Button>
            <Button variant="outline-secondary" onClick={handleDownloadSummary}>
              Download Summary
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Low Stock Modal */}
      <Modal
        show={showLowStockModal}
        onHide={() => setShowLowStockModal(false)}
        size="lg"
        centered
        backdrop="static"
        dialogClassName="low-stock-modal-centered"
      >
        <Modal.Header closeButton>
          <Modal.Title>All Low Stock Items</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ maxHeight: 400, overflowY: "auto", overflowX: "hidden" }}>
            <Table striped bordered hover size="sm" style={{ minWidth: 800, tableLayout: "fixed" }}>
              <thead>
                <tr>
                  <th style={{ width: "28%" }}>Product Name</th>
                  <th style={{ width: "14%" }}>Model No</th>
                  <th style={{ width: "14%" }}>Make</th>
                  <th style={{ width: "10%" }}>Quantity</th>
                  <th style={{ width: "14%" }}>Reorder Level</th>
                  <th style={{ width: "10%" }}>Unit</th>
                </tr>
              </thead>
              <tbody>
                {minimumStock.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center">
                      No low stock items.
                    </td>
                  </tr>
                ) : (
                  minimumStock.map((item) => (
                    <tr key={item.Prod_Id}>
                      <td style={{ wordBreak: "break-word" }}>{item.Product_name}</td>
                      <td>{item.Model_no}</td>
                      <td>{item.Make}</td>
                      <td style={{ color: "#e74c3c", fontWeight: 700 }}>{item.Quantity}</td>
                      <td>{item.Minimum || 50}</td>
                      <td>{item.Unit}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </Table>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLowStockModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Full Report Modal */}
      <Modal
        show={showFullReportModal}
        onHide={() => setShowFullReportModal(false)}
        size="xl"
        centered
        backdrop="static"
        dialogClassName="modal-90w"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <span style={{ fontWeight: 700 }}>Full Inventory Report</span>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ minHeight: 500 }}>
          <div style={{ marginBottom: 16, display: "flex", gap: 16 }}>
            <Button
              variant={fullReportTab === "stock" ? "primary" : "outline-primary"}
              onClick={() => setFullReportTab("stock")}
            >
              Stock
            </Button>
            <Button
              variant={fullReportTab === "stockin" ? "primary" : "outline-primary"}
              onClick={() => setFullReportTab("stockin")}
            >
              Stock In
            </Button>
            <Button
              variant={fullReportTab === "stockout" ? "primary" : "outline-primary"}
              onClick={() => setFullReportTab("stockout")}
            >
              Stock Out
            </Button>
          </div>
          {loadingFullReport ? (
            <div className="d-flex justify-content-center align-items-center" style={{ minHeight: 300 }}>
              <Spinner animation="border" variant="primary" />
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <Table striped bordered hover size="sm">
                <thead>
                  <tr>
                    {columns[fullReportTab].map((col) => (
                      <th key={col.label}>{col.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fullReportData[fullReportTab].length === 0 ? (
                    <tr>
                      <td colSpan={columns[fullReportTab].length} className="text-center">
                        No data found.
                      </td>
                    </tr>
                  ) : (
                    fullReportData[fullReportTab].map((row, idx) => (
                      <tr key={row.Id || row.Prod_Id || idx}>
                        {columns[fullReportTab].map((col) => (
                          <td key={col.label}>
                            {typeof col.key === "function" ? col.key(row) : row[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowFullReportModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default QuickReportModal;