import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useNavigate,
  useLocation,
} from "react-router-dom";

import SplashScreen from "./SplashScreen";
import SalesDashboard from "./SalesDashboard";
import SalesOrderData from "./SalesOrderData";
import SalesOrderForm from "./SalesOrderform";
import SalesOrderDetail from "./SalesOrderdetail";
import ProductionDetail from "./ProductionDetail";
import AllOrders from "./AllOrders";
import SampleDesignUpload from "./SampleDesignUpload";
// import BifurcateOrder from "./BifurcateOrder";
import FabricIssues from "./FabricIssue";
import JobOrderForm from "./JobOrder";
import JobOrders from "./AllJobOrder";
import EmbroideryChallan from "./EmbroideryChallan";
import PrintingChallan from "./PrintingChallan";
import GoogleSheetTable from "./CuttingBudgetMaker";
import JobOrderAllData from "./Details";

import Login from "./Login";
import Header from "./Header";
import { AuthProvider } from "./auth/AuthContext";
import { RequireAuth, RequireRole } from "./auth/Guards";
import PendingChallans from "./PendingChallan";
import PrintingPendingChallans from "./PendingPrintingChallan";
import TrainingandDevelopment from "./SOP";
import JobOrderCancellationForm from "./JobOrderCancellationform";
import BusinessHoursGate from "./BusinessHoursGate";
import SalesOrderCancellationForm from "./SalesOrderCancellationForm";
import IssueStitching from "./IssueStitching";
import RateCalculator from "./RateList";
import CuttingStatsReport from "./CuttingStats";
import KarigarAssignment from "./KarigarAssignment";
import IssuePacking from "./KarigarOrder";

function AppContent() {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.pathname === "/") {
      const splashTimer = setTimeout(() => {
        setShowSplash(false);
        navigate("/dashboard"); // redirect once after splash
      }, 2500);
      return () => clearTimeout(splashTimer);
    }
  }, [location.pathname, navigate]);

  const Gated = ({ children }) => (
    <BusinessHoursGate>{children}</BusinessHoursGate>
  );

  if (location.pathname === "/") {
    return (
      <>
        <Header />
        {showSplash && <SplashScreen />}
      </>
    );
  }

  return (
    <>
      <Header />

      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Gated>
                <SalesDashboard />
              </Gated>
            </RequireAuth>
          }
        />

        <Route
          path="/sales-order"
          element={
            <RequireRole roles={["admin", "sales"]}>
              <Gated>
                <SalesOrderForm />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/sales-orders/:partyName"
          element={
            <RequireRole roles={["admin", "sales"]}>
              <Gated>
                <SalesOrderDetail />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/sales-data"
          element={
            <RequireRole roles={["admin", "sales", "viewer"]}>
              <Gated>
                <SalesOrderData />
              </Gated>
            </RequireRole>
          }
        />
         <Route
          path="/checking-packing"
          element={
            <RequireRole roles={["admin", "sales", "viewer"]}>
              <Gated>
                <IssuePacking />
              </Gated>
            </RequireRole>
          }
        />
         <Route
          path="/Karigar-details"
          element={
            <RequireRole roles={["admin", "sales", "viewer"]}>
              <Gated>
                <KarigarAssignment />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/production/:orderNo"
          element={
            <RequireRole roles={["admin", "production"]}>
              <Gated>
                <ProductionDetail />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/all-order-details"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <Gated>
                <AllOrders />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/sample-design-form"
          element={
            <RequireRole roles={["admin", "sales"]}>
              <Gated>
                <SampleDesignUpload />
              </Gated>
            </RequireRole>
          }
        />

        {/* <Route
          path="/bifurcate-orders"
          element={
            <RequireRole roles={["admin", "production"]}>
              <Gated>
                <BifurcateOrder />
              </Gated>
            </RequireRole>
          }
        /> */}

        <Route
          path="/pending-fabric-issues"
          element={
            <RequireRole roles={["admin", "production"]}>
              <Gated>
                <FabricIssues />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/emb-Pending-Challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <Gated>
                <PendingChallans />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/issue-to-stitching"
          element={
            <RequireRole roles={["admin", "production"]}>
              <Gated>
                <IssueStitching />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/printing-Pending-Challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <Gated>
                <PrintingPendingChallans />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/job-order-form"
          element={
            <RequireRole roles={["admin", "production"]}>
              <Gated>
                <JobOrderForm />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/embroidery-challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <Gated>
                <EmbroideryChallan />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/printing-challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <Gated>
                <PrintingChallan />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/all-job-orders"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <Gated>
                <JobOrders />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/cutting-budget"
          element={
            <RequireRole roles={["admin", "production"]}>
              <Gated>
                <GoogleSheetTable />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/sop"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <Gated>
                <TrainingandDevelopment />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/cancel-order/sales"
          element={
            <RequireRole roles={["admin", "production"]}>
              <Gated>
                <SalesOrderCancellationForm />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/cancel-order/job"
          element={
            <RequireRole roles={["production", "admin"]}>
              <Gated>
                <JobOrderCancellationForm />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/stitching-rate-list"
          element={
            <RequireRole roles={["production", "admin"]}>
              <Gated>
                <RateCalculator />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/details"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <Gated>
                <JobOrderAllData />
              </Gated>
            </RequireRole>
          }
        />

        <Route
          path="/cutting-stats-report"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <Gated>
                <CuttingStatsReport />
              </Gated>
            </RequireRole>
          }
        />

        <Route path="*" element={<div>Page Not Found</div>} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        {/* 👇 white background wrapper for entire app */}
        <div style={{ backgroundColor: "white", minHeight: "100vh" }}>
          <AppContent />
        </div>
      </Router>
    </AuthProvider>
  );
}
