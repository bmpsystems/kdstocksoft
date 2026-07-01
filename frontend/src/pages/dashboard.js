import React, { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Spinner,
  Table,
  Badge,
  Button,
  InputGroup,
  FormControl,
  OverlayTrigger,
  Tooltip,
} from "react-bootstrap";
import { Line, Doughnut } from "react-chartjs-2";
import "chart.js/auto";
import QuickReportModal from "../components/QuickReportModal";

// --- ICONS ---
import {
  FaBoxOpen,
  FaExclamationTriangle,
  FaTimesCircle,
  FaRupeeSign,
  FaChartLine,
  FaChartPie,
  FaClipboardList,
  FaExchangeAlt,
  FaSearch,
  FaBolt,
} from "react-icons/fa";
import { MdInventory, MdReport } from "react-icons/md";
import { IoMdTrendingUp, IoMdTrendingDown } from "react-icons/io";

const API_STOCK = "https://kdstocksoft.onrender.com/stock-dashboard";
const API_STOCKIN = "https://kdstocksoft.onrender.com/stock-in-dashboard";
const API_STOCKOUT = "https://kdstocksoft.onrender.com/stock-out-dashboard";
const API_LOWSTOCK = "https://kdstocksoft.onrender.com/low-stock";
const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const DashboardPg = () => {
  const [stock, setStock] = useState([]);
  const [stockIn, setStockIn] = useState([]);
  const [stockOut, setStockOut] = useState([]);
  const [minimumStock, setMinimumStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showQuickReport, setShowQuickReport] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(API_STOCK).then((r) => r.json()),
      fetch(API_STOCKIN).then((r) => r.json()),
      fetch(API_STOCKOUT).then((r) => r.json()),
      fetch(API_LOWSTOCK).then((r) => r.json()),
    ])
      .then(([stockData, stockInData, stockOutData, minStockData]) => {
        setStock(stockData);
        setStockIn(stockInData);
        setStockOut(stockOutData);
        setMinimumStock(minStockData);
        setLoading(false);
      })
      .catch((err) => {
        setLoading(false);
        alert("Failed to load dashboard data: " + err.message);
      });
  }, []);

  // --- Stat Cards ---
  const totalProducts = stock.length;
  const lowStockItems = minimumStock.length; // API returns only low stock
  const outOfStock = stock.filter((item) => Number(item.Quantity) === 0).length;
  const totalInventoryValue = stock.reduce(
    (sum, item) =>
      sum + (Number(item.Quantity) || 0) * (Number(item.Cost_Price) || 0),
    0,
  );

  // --- Inventory Movement (Last 7 Months) ---
  const getMonth = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return `${monthNames[d.getMonth()]}`;
  };
  const now = new Date();
  const last7Months = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    last7Months.push(monthNames[d.getMonth()]);
  }
  const inByMonth = {};
  stockIn.forEach((item) => {
    const m = getMonth(item.Purchase_Date);
    inByMonth[m] = (inByMonth[m] || 0) + (Number(item.Quantity) || 0);
  });
  const outByMonth = {};
  stockOut.forEach((item) => {
    const m = getMonth(item.Invoice_Date);
    outByMonth[m] = (outByMonth[m] || 0) + (Number(item.Quantity) || 0);
  });
  const lineData = {
    labels: last7Months,
    datasets: [
      {
        label: "In",
        data: last7Months.map((m) => inByMonth[m] || 0),
        borderColor: "#36A2EB",
        backgroundColor: "#36A2EB33",
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#36A2EB",
      },
      {
        label: "Out",
        data: last7Months.map((m) => outByMonth[m] || 0),
        borderColor: "#e74c3c",
        backgroundColor: "#e74c3c22",
        tension: 0.4,
        fill: true,
        pointRadius: 5,
        pointBackgroundColor: "#e74c3c",
      },
    ],
  };

  // --- Stock Level Distribution ---
  let high = 0,
    medium = 0,
    low = 0,
    out = 0;
  stock.forEach((item) => {
    const minObj = minimumStock.find((m) => m.Prod_Id === item.Prod_Id);
    const min = minObj ? Number(minObj.Minimum) || 50 : 50;
    const qty = Number(item.Quantity) || 0;
    if (qty === 0) out++;
    else if (qty < min) low++;
    else if (qty < 2 * min) medium++;
    else high++;
  });
  const donutData = {
    labels: ["High Stock", "Medium Stock", "Low Stock", "Out of Stock"],
    datasets: [
      {
        data: [high, medium, low, out],
        backgroundColor: ["#27ae60", "#f1c40f", "#FFA500", "#e74c3c"],
        hoverBackgroundColor: ["#2ecc40", "#FFD700", "#FFB84D", "#c0392b"],
        borderWidth: 2,
      },
    ],
  };

  // // --- Recent Orders (Mock Data) ---
  // const recentOrders = [
  //   { id: "ORD001", customer: "Alice Smith", date: "2025-07-09", total: 1200, status: "Shipped" },
  //   { id: "ORD002", customer: "Bob Johnson", date: "2025-07-08", total: 850, status: "Processing" },
  //   { id: "ORD003", customer: "Charlie Brown", date: "2025-07-08", total: 2500, status: "Delivered" },
  //   { id: "ORD004", customer: "Diana Prince", date: "2025-07-07", total: 300, status: "Pending" },
  //   { id: "ORD005", customer: "Eve Adams", date: "2025-07-07", total: 1800, status: "Shipped" },
  // ];
  // const statusColor = {
  //   Shipped: "success",
  //   Processing: "warning",
  //   Delivered: "primary",
  //   Pending: "secondary",
  // };
  // const statusIcon = {
  //   Shipped: <IoMdTrendingUp style={{ color: "#27ae60", fontSize: 18, verticalAlign: "middle" }} />,
  //   Processing: <FaBolt style={{ color: "#f1c40f", fontSize: 16, verticalAlign: "middle" }} />,
  //   Delivered: <FaBoxOpen style={{ color: "#2980f2", fontSize: 16, verticalAlign: "middle" }} />,
  //   Pending: <FaExclamationTriangle style={{ color: "#e67e22", fontSize: 16, verticalAlign: "middle" }} />,
  // };

  function compareInvoiceNoDesc(a, b) {
    // Try to parse as numbers, fallback to string compare
    const aNum = Number(a);
    const bNum = Number(b);
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return bNum - aNum;
    }
    // If one is number and other is not, numbers come first
    if (!isNaN(aNum) && isNaN(bNum)) return -1;
    if (isNaN(aNum) && !isNaN(bNum)) return 1;
    // Both are not numbers, compare as strings descending
    if (a < b) return 1;
    if (a > b) return -1;
    return 0;
  }

  // Group stockOut by Invoice_No, sort by Invoice_No descending, and flatten the latest N invoice groups
  function getRecentStockOutAdjustmentsByInvoice(stockOut, count = 4) {
    // Filter out records without Invoice_No
    const withInvoice = stockOut.filter((item) => item.Invoice_No);
    // Group by Invoice_No
    const invoiceGroups = {};
    withInvoice.forEach((item) => {
      if (!invoiceGroups[item.Invoice_No]) {
        invoiceGroups[item.Invoice_No] = [];
      }
      invoiceGroups[item.Invoice_No].push(item);
    });
    // Get array of {invoiceNo, date, items}
    const invoiceArr = Object.entries(invoiceGroups).map(
      ([invoiceNo, items]) => {
        // Use the latest Invoice_Date in the group
        const latestDate =
          items
            .map((i) => i.Invoice_Date)
            .filter(Boolean)
            .sort((a, b) => new Date(b) - new Date(a))[0] || "";
        return {
          invoiceNo,
          date: latestDate,
          items,
        };
      },
    );
    // Sort by invoiceNo descending (as per requirement)
    invoiceArr.sort((a, b) => compareInvoiceNoDesc(a.invoiceNo, b.invoiceNo));
    // Take the most recent N invoice groups
    const recentInvoices = invoiceArr.slice(0, count);

    // Flatten to adjustment rows
    const adjustments = [];
    recentInvoices.forEach((group) => {
      group.items.forEach((item) => {
        adjustments.push({
          id: `ADJ-OUT-${item.Id}`,
          invoiceNo: group.invoiceNo,
          challan: group.Delivery_Challan,
          product: item.Product_name,
          modelNo: item.Model_no,
          type: "Out",
          quantity: `-${item.Quantity}`,
          date: item.Invoice_Date
            ? new Date(item.Invoice_Date).toLocaleDateString("en-GB")
            : "",
          user: item.Created_By,
        });
      });
    });
    return adjustments;
  }

  // If there are no Invoice_No, fallback to previous logic (show latest 4 adjustments)
  let adjustments = [];
  const stockOutWithInvoice = stockOut.filter((item) => item.Invoice_No);
  if (stockOutWithInvoice.length > 0) {
    adjustments = getRecentStockOutAdjustmentsByInvoice(stockOut, 10);
  } else {
    adjustments = [
      ...stockIn.map((item) => ({
        id: `ADJ-IN-${item.Id}`,
        product: item.Product_name,
        type: "In",
        quantity: `+${item.Quantity}`,
        date: item.Purchase_Date
          ? new Date(item.Purchase_Date).toLocaleDateString("en-GB")
          : "",
        user: item.Created_By,
      })),
      ...stockOut.map((item) => ({
        id: `ADJ-OUT-${item.Id}`,
        product: item.Product_name,
        type: "Out",
        quantity: `-${item.Quantity}`,
        date: item.Invoice_Date
          ? new Date(item.Invoice_Date).toLocaleDateString("en-GB")
          : "",
        user: item.Created_By,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4);
  }

  // --- Stat Card Data ---
  // const statCards = [
  //   {
  //     title: "Total Products",
  //     value: totalProducts.toLocaleString(),
  //     icon: (
  //       <MdInventory
  //         size={36}
  //         style={{
  //           color: "#fff",
  //           background: "#2980f2",
  //           borderRadius: 8,
  //           padding: 6,
  //         }}
  //       />
  //     ),
  //     color: "#2980f2",
  //     sub: (
  //       <span style={{ color: "#b3e5fc" }}>
  //         <IoMdTrendingUp /> +2% from last month
  //       </span>
  //     ),
  //        onClick: () => window.open("https://bmpsystems.in", "_blank"),
  //   },
  //   {
  //     title: "Low Stock Items",
  //     value: lowStockItems,
  //     icon: (
  //       <FaExclamationTriangle
  //         size={32}
  //         style={{
  //           color: "#fff",
  //           background: "#f1c40f",
  //           borderRadius: 8,
  //           padding: 6,
  //         }}
  //       />
  //     ),
  //     color: "#f1c40f",
  //     sub: (
  //       <span style={{ color: "#fffbe6" }}>
  //         <FaBolt /> Needs Attention
  //       </span>
  //     ),
  //   },
  //   {
  //     title: "Out of Stock",
  //     value: outOfStock,
  //     icon: (
  //       <FaTimesCircle
  //         size={32}
  //         style={{
  //           color: "#fff",
  //           background: "#e74c3c",
  //           borderRadius: 8,
  //           padding: 6,
  //         }}
  //       />
  //     ),
  //     color: "#e74c3c",
  //     sub: (
  //       <span style={{ color: "#ffd6d6" }}>
  //         <FaExclamationTriangle /> Urgent Action
  //       </span>
  //     ),
  //   },
  //   {
  //     title: "Inventory Value",
  //     value: `₹${totalInventoryValue.toLocaleString()}`,
  //     icon: (
  //       <FaRupeeSign
  //         size={32}
  //         style={{
  //           color: "#fff",
  //           background: "#27ae60",
  //           borderRadius: 8,
  //           padding: 6,
  //         }}
  //       />
  //     ),
  //     color: "#27ae60",
  //     sub: (
  //       <span style={{ color: "#b9f6ca" }}>
  //         <IoMdTrendingUp /> +1.5% this quarter
  //       </span>
  //     ),
  //   },
  // ];

  const statCards = [
    {
      title: "Total Products",
      value: totalProducts.toLocaleString(),
      icon: (
        <MdInventory
          size={36}
          style={{
            color: "#fff",
            background: "#2980f2",
            borderRadius: 8,
            padding: 6,
          }}
        />
      ),
      color: "#2980f2",
      sub: (
        <span style={{ color: "#b3e5fc" }}>
          <IoMdTrendingUp /> +2% from last month
        </span>
      ),
      onClick: () => window.open("https://kdstocksoft.vercel.app/products", "_blank"),
    },
    {
      title: "Low Stock Items",
      value: lowStockItems,
      icon: (
        <FaExclamationTriangle
          size={32}
          style={{
            color: "#fff",
            background: "#f1c40f",
            borderRadius: 8,
            padding: 6,
          }}
        />
      ),
      color: "#f1c40f",
      sub: (
        <span style={{ color: "#fffbe6" }}>
          <FaBolt /> Needs Attention
        </span>
      ),
      onClick: () => window.open("https://kdstocksoft.vercel.app/low-stock", "_blank"),
    },
    {
      title: "Out of Stock",
      value: outOfStock,
      icon: (
        <FaTimesCircle
          size={32}
          style={{
            color: "#fff",
            background: "#e74c3c",
            borderRadius: 8,
            padding: 6,
          }}
        />
      ),
      color: "#e74c3c",
      sub: (
        <span style={{ color: "#ffd6d6" }}>
          <FaExclamationTriangle /> Urgent Action
        </span>
      ),
      onClick: () => window.open("https://kdstocksoft.vercel.app/out-of-stock", "_blank"),
    },
    {
      title: "Inventory Value",
      value: `₹${totalInventoryValue.toLocaleString()}`,
      icon: (
        <FaRupeeSign
          size={32}
          style={{
            color: "#fff",
            background: "#27ae60",
            borderRadius: 8,
            padding: 6,
          }}
        />
      ),
      color: "#27ae60",
      sub: (
        <span style={{ color: "#b9f6ca" }}>
          <IoMdTrendingUp /> +1.5% this quarter
        </span>
      ),
      onClick: () => window.open("https://kdstocksoft.vercel.app/stock-summary", "_blank"),
    },
  ];

  // --- Dashboard Header Gradient ---
  const headerGradient = "linear-gradient(90deg, #2980f2 0%, #27ae60 100%)";

  const recentStockIn = [...stockIn]
    .sort((a, b) => Number(b.Id) - Number(a.Id))
    .slice(0, 10);

  return (
    <Container
      fluid
      className="py-4"
      style={{
        background: "linear-gradient(135deg, #f8f9fa 60%, #e3f6fd 100%)",
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 32,
          padding: "24px 32px",
          borderRadius: 18,
          background: headerGradient,
          boxShadow: "0 4px 24px 0 rgba(41,128,242,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <FaChartLine size={36} style={{ color: "#fff" }} />
          <h2
            style={{
              fontWeight: 800,
              letterSpacing: 1,
              color: "#fff",
              margin: 0,
              fontSize: 32,
              textShadow: "0 2px 8px #2980f2aa",
            }}
          >
            Stock Dashboard
          </h2>
        </div>
        {/* <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <OverlayTrigger
            placement="bottom"
            overlay={<Tooltip>Quick Report</Tooltip>}
          >
            <Button
              variant="light"
              style={{
                background: "#fff",
                color: "#2980f2",
                fontWeight: 700,
                borderRadius: 8,
                boxShadow: "0 2px 8px #2980f222",
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 16,
              }}
              onClick={() => setShowQuickReport(true)}
            >
              <MdReport size={22} />
              Quick Report
            </Button>
          </OverlayTrigger>
        </div> */}
      </div>

      {/* Quick Report Modal */}
      <QuickReportModal
        show={showQuickReport}
        onHide={() => setShowQuickReport(false)}
        totalProducts={totalProducts}
        lowStockItems={lowStockItems}
        totalInventoryValue={totalInventoryValue}
        donutData={donutData}
        minimumStock={minimumStock}
        onViewFullReport={() => {
          setShowQuickReport(false);
          // Add navigation or logic here
        }}
      />

      {loading ? (
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: 300 }}
        >
          <Spinner
            animation="border"
            variant="primary"
            style={{ width: 60, height: 60 }}
          />
        </div>
      ) : (
        <>
          {/* Stat Cards */}
          <Row className="mb-4" style={{ gap: 0 }}>
            {statCards.map((card, idx) => (
              <Col
                key={card.title}
                md={3}
                sm={6}
                xs={12}
                className="mb-3"
                style={{ minWidth: 260 }}
              >
                <Card
                  className="shadow-lg border-0"
                  onClick={card.onClick}
                  style={{
                    cursor: "pointer",
                    background: `linear-gradient(120deg, ${card.color} 80%, #fff 100%)`,
                    color: "#fff",
                    borderRadius: 18,
                    minHeight: 140,
                    boxShadow: `0 4px 24px 0 ${card.color}22`,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <Card.Body style={{ padding: 24, position: "relative" }}>
                    <div
                      style={{
                        position: "absolute",
                        top: 18,
                        right: 24,
                        opacity: 0.18,
                        fontSize: 64,
                        zIndex: 0,
                      }}
                    >
                      {card.icon}
                    </div>
                    <Card.Title
                      style={{
                        fontWeight: 600,
                        fontSize: 18,
                        letterSpacing: 0.5,
                        zIndex: 1,
                        position: "relative",
                        color: "#fff",
                        marginBottom: 8,
                      }}
                    >
                      {card.title}
                    </Card.Title>
                    <h3
                      style={{
                        fontWeight: 800,
                        fontSize: 32,
                        margin: 0,
                        zIndex: 1,
                        position: "relative",
                        color: "#fff",
                        textShadow: "0 2px 8px #0002",
                      }}
                    >
                      {card.value}
                    </h3>
                    <div
                      style={{
                        fontSize: 14,
                        opacity: 0.95,
                        marginTop: 8,
                        zIndex: 1,
                        position: "relative",
                      }}
                    >
                      {card.sub}
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>

          {/* Charts */}
          <Row className="mb-4" style={{ gap: 0 }}>
            <Col md={8} className="mb-4">
              <Card
                className="h-100 shadow-lg border-0"
                style={{
                  borderRadius: 18,
                  background: "#fff",
                  minHeight: 340,
                  boxShadow: "0 4px 24px 0 #2980f222",
                }}
              >
                <Card.Body>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <FaChartLine style={{ color: "#2980f2", fontSize: 22 }} />
                    <Card.Title
                      style={{ fontWeight: 700, fontSize: 18, margin: 0 }}
                    >
                      Inventory Movement (Last 7 Months)
                    </Card.Title>
                  </div>
                  <Line
                    data={lineData}
                    options={{
                      plugins: {
                        legend: {
                          display: true,
                          position: "bottom",
                          labels: {
                            font: { size: 14, weight: "bold" },
                            color: "#333",
                          },
                        },
                        tooltip: {
                          backgroundColor: "#fff",
                          titleColor: "#2980f2",
                          bodyColor: "#333",
                          borderColor: "#2980f2",
                          borderWidth: 1,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          grid: { color: "#e3e3e3" },
                          ticks: { color: "#888" },
                        },
                        x: {
                          grid: { color: "#f3f3f3" },
                          ticks: { color: "#888" },
                        },
                      },
                    }}
                  />
                </Card.Body>
              </Card>
            </Col>
            <Col md={4} className="mb-4">
              <Card
                className="h-100 shadow-lg border-0"
                style={{
                  borderRadius: 18,
                  background: "#fff",
                  minHeight: 340,
                  boxShadow: "0 4px 24px 0 #27ae6022",
                }}
              >
                <Card.Body>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <FaChartPie style={{ color: "#27ae60", fontSize: 22 }} />
                    <Card.Title
                      style={{ fontWeight: 700, fontSize: 18, margin: 0 }}
                    >
                      Stock Level Distribution
                    </Card.Title>
                  </div>
                  <Doughnut
                    data={donutData}
                    options={{
                      plugins: {
                        legend: {
                          position: "bottom",
                          labels: {
                            font: { size: 14, weight: "bold" },
                            color: "#333",
                          },
                        },
                        tooltip: {
                          backgroundColor: "#fff",
                          titleColor: "#27ae60",
                          bodyColor: "#333",
                          borderColor: "#27ae60",
                          borderWidth: 1,
                        },
                      },
                      cutout: "70%",
                    }}
                  />
                  <div
                    style={{
                      marginTop: 18,
                      fontSize: 15,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                      fontWeight: 500,
                    }}
                  >
                    <span>
                      <span style={{ color: "#27ae60", fontWeight: 700 }}>
                        ●
                      </span>{" "}
                      High Stock{" "}
                      <span style={{ color: "#27ae60" }}>
                        {Math.round((high / totalProducts) * 100) || 0}%
                      </span>
                    </span>
                    <span>
                      <span style={{ color: "#FFA500", fontWeight: 700 }}>
                        ●
                      </span>{" "}
                      Low Stock{" "}
                      <span style={{ color: "#FFA500" }}>
                        {Math.round((low / totalProducts) * 100) || 0}%
                      </span>
                    </span>
                    <span>
                      <span style={{ color: "#f1c40f", fontWeight: 700 }}>
                        ●
                      </span>{" "}
                      Medium Stock{" "}
                      <span style={{ color: "#f1c40f" }}>
                        {Math.round((medium / totalProducts) * 100) || 0}%
                      </span>
                    </span>
                    <span>
                      <span style={{ color: "#e74c3c", fontWeight: 700 }}>
                        ●
                      </span>{" "}
                      Out of Stock{" "}
                      <span style={{ color: "#e74c3c" }}>
                        {Math.round((out / totalProducts) * 100) || 0}%
                      </span>
                    </span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          {/* Tables */}
          <Row>
            <Col md={6} className="mb-4">
              <Card
                className="h-100 shadow-lg border-0"
                style={{
                  borderRadius: 18,
                  background: "#fff",
                  minHeight: 320,
                  boxShadow: "0 4px 24px 0 #2980f222",
                }}
              >
                <Card.Body>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <FaBoxOpen
                      style={{
                        color: "#2980f2",
                        fontSize: 20,
                      }}
                    />
                    <Card.Title
                      style={{
                        fontWeight: 700,
                        fontSize: 18,
                        margin: 0,
                      }}
                    >
                      Recent Stock In
                    </Card.Title>
                  </div>

                  <div
                    style={{
                      maxHeight: 220,
                      overflowY: "auto",
                    }}
                  >
                    <Table
                      size="sm"
                      hover
                      responsive
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f8faff",
                      }}
                    >
                      <thead
                        style={{
                          background: "#f3f6fa",
                        }}
                      >
                        <tr>
                          <th>PO NO</th>
                          <th>PRODUCT</th>
                          <th>QTY</th>
                          <th>DATE</th>
                          <th>USER</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentStockIn.map((item) => (
                          <tr key={item.Id}>
                            <td
                              style={{
                                fontWeight: 600,
                                color: "#2980f2",
                              }}
                            >
                              {item.Purchase_Order}
                            </td>

                            <td>{item.Model_no}</td>

                            <td>
                              <Badge
                                bg="success"
                                style={{
                                  fontSize: 13,
                                  padding: "6px 12px",
                                  borderRadius: 12,
                                }}
                              >
                                +{item.Quantity}
                              </Badge>
                            </td>

                            <td>
                              {item.Purchase_Date
                                ? new Date(
                                    item.Purchase_Date,
                                  ).toLocaleDateString("en-GB")
                                : ""}
                            </td>

                            <td>{item.Created_By}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
            <Col md={6} className="mb-4">
              <Card
                className="h-100 shadow-lg border-0"
                style={{
                  borderRadius: 18,
                  background: "#fff",
                  minHeight: 320,
                  boxShadow: "0 4px 24px 0 #27ae6022",
                }}
              >
                <Card.Body>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 8,
                    }}
                  >
                    <FaBoxOpen style={{ color: "#e74c3c", fontSize: 20 }} />
                    <Card.Title
                      style={{ fontWeight: 700, fontSize: 18, margin: 0 }}
                    >
                      Recent Stock Out
                    </Card.Title>
                  </div>
                  <div style={{ maxHeight: 220, overflowY: "auto" }}>
                    <Table
                      size="sm"
                      hover
                      responsive
                      style={{
                        borderRadius: 12,
                        overflow: "hidden",
                        background: "#f8faff",
                      }}
                    >
                      <thead style={{ background: "#f3f6fa" }}>
                        <tr>
                          {/* <th>ID</th> */}
                          {/* Show Invoice No if present */}
                          {adjustments.length > 0 &&
                            adjustments[0].invoiceNo && <th>INVOICE</th>}
                          <th>PRODUCT</th>
                          <th>QTY</th>
                          <th>DATE</th>
                          <th>USER</th>
                        </tr>
                      </thead>
                      <tbody>
                        {adjustments.map((adj) => (
                          <tr key={adj.id}>
                            {/* <td style={{ fontWeight: 600 }}>{adj.id.replace("ADJ-", "")}</td> */}
                            {/* Show Invoice No if present */}
                            <td>
                              {adj.invoiceNo
                                ? adj.invoiceNo +
                                  (adj.challan ? " " + adj.challan : "")
                                : adj.challan || ""}
                            </td>
                            <td>{adj.modelNo}</td>
                            <td>
                              <Badge
                                bg="danger"
                                style={{
                                  fontSize: 13,
                                  padding: "6px 12px",
                                  borderRadius: 12,
                                }}
                              >
                                {adj.quantity}
                              </Badge>
                            </td>
                            <td>{adj.date}</td>
                            <td>{adj.user}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </Container>
  );
};

export default DashboardPg;
