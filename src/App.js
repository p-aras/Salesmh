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
import MaterialRequisitionForm from "./MaterialRequisitionform";
import Parta from "./Parta";

// 👇 IMPORT YOUR NEW COMPONENT HERE

import UpdatePackingReport from "./UpdatePackingReport";

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
              <SalesDashboard />
            </RequireAuth>
          }
        />
         <Route
          path="/parta-details"
          element={
            <RequireAuth>
              <Parta/>
            </RequireAuth>
          }
        />

        <Route
          path="/sales-order"
          element={
            <RequireRole roles={["admin", "sales"]}>
              <SalesOrderForm />
            </RequireRole>
          }
        />

        <Route
          path="/sales-orders/:partyName"
          element={
            <RequireRole roles={["admin", "sales"]}>
              <SalesOrderDetail />
            </RequireRole>
          }
        />

        <Route
          path="/sales-data"
          element={
            <RequireRole roles={["admin", "sales", "viewer"]}>
              <SalesOrderData />
            </RequireRole>
          }
        />
         <Route
          path="/checking-packing"
          element={
            <RequireRole roles={["admin", "sales", "viewer"]}>
              <IssuePacking />
            </RequireRole>
          }
        />
         <Route
          path="/Karigar-details"
          element={
            <RequireRole roles={["admin", "sales", "viewer"]}>
              <KarigarAssignment />
            </RequireRole>
          }
        />

        <Route
          path="/production/:orderNo"
          element={
            <RequireRole roles={["admin", "production"]}>
              <ProductionDetail />
            </RequireRole>
          }
        />

        <Route
          path="/all-order-details"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <AllOrders />
            </RequireRole>
          }
        />

        <Route
          path="/sample-design-form"
          element={
            <RequireRole roles={["admin", "sales"]}>
              <SampleDesignUpload />
            </RequireRole>
          }
        />

        {/* <Route
          path="/bifurcate-orders"
          element={
            <RequireRole roles={["admin", "production"]}>
              <BifurcateOrder />
            </RequireRole>
          }
        /> */}

        <Route
          path="/pending-fabric-issues"
          element={
            <RequireRole roles={["admin", "production"]}>
              <FabricIssues />
            </RequireRole>
          }
        />

        <Route
          path="/emb-Pending-Challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <PendingChallans />
            </RequireRole>
          }
        />
            <Route
          path="/material-requisition-form"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <MaterialRequisitionForm />
            </RequireRole>
          }
        />

        <Route
          path="/issue-to-stitching"
          element={
            <RequireRole roles={["admin", "production"]}>
              <IssueStitching />
            </RequireRole>
          }
        />

        <Route
          path="/printing-Pending-Challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <PrintingPendingChallans />
            </RequireRole>
          }
        />

        <Route
          path="/job-order-form"
          element={
            <RequireRole roles={["admin", "production"]}>
              <JobOrderForm />
            </RequireRole>
          }
        />

        <Route
          path="/embroidery-challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <EmbroideryChallan />
            </RequireRole>
          }
        />

        <Route
          path="/printing-challan"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <PrintingChallan />
            </RequireRole>
          }
        />

        <Route
          path="/all-job-orders"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <JobOrders />
            </RequireRole>
          }
        />

        <Route
          path="/cutting-budget"
          element={
            <RequireRole roles={["admin", "production"]}>
              <GoogleSheetTable />
            </RequireRole>
          }
        />

        <Route
          path="/sop"
          element={
            <RequireRole roles={["admin", "production", "design"]}>
              <TrainingandDevelopment />
            </RequireRole>
          }
        />

        <Route
          path="/cancel-order/sales"
          element={
            <RequireRole roles={["admin", "production"]}>
              <SalesOrderCancellationForm />
            </RequireRole>
          }
        />

        <Route
          path="/cancel-order/job"
          element={
            <RequireRole roles={["production", "admin"]}>
              <JobOrderCancellationForm />
            </RequireRole>
          }
        />

        <Route
          path="/stitching-rate-list"
          element={
            <RequireRole roles={["production", "admin"]}>
              <RateCalculator />
            </RequireRole>
          }
        />

        <Route
          path="/details"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <JobOrderAllData />
            </RequireRole>
          }
        />

        <Route
          path="/cutting-stats-report"
          element={
            <RequireRole roles={["admin", "production", "sales"]}>
              <CuttingStatsReport />
            </RequireRole>
          }
        />

        {/* 👇 ADD YOUR NEW ROUTE HERE - choose an appropriate path and roles */}
        <Route
          path="/packing-report" // Replace with your desired URL path
          element={
            <RequireRole roles={["admin", "production", "sales"]}> {/* Adjust roles as needed */}
              <UpdatePackingReport />
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