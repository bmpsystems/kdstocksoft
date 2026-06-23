import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layout/MainLayout';
import Login from './layout/Login';
import ProductMaster from './pages/productMaster';
import DashboardPg from './pages/dashboard';
import SettingsPg from './pages/settings';
import Stocksummary from './pages/stock_summary';
import Home from './pages/home';
import CustomerReport from './pages/customerReport';
import EmailMarketing from './pages/emailMarketing';
import OutOfStock from './pages/outOfStock';
import ProductCategoryMaster from './pages/productCategoryMaster';
import Stock from './pages/stock';
import StockIn from './pages/stock_in';
import MakeMaster from './pages/makeMaster';
import StateMaster from './pages/stateMaster';
import CountryMaster from './pages/countryMaster';
import VendorMaster from './pages/vendorMaster';
import BankMaster from './pages/bankMaster';
import CompanyMaster from './pages/companyMaster';
import DailyStockReport from './pages/dailystockReport';
import DailyStockIn from './pages/dailystockIn';
import DailyStockOut from './pages/dailystockOut';
import ProductInOut from './pages/productInOut';
import StockOut from './pages/stock_out';
import Users from './pages/users';
import DepartmentMaster from './pages/departmentMaster';
import CategoryMaster from './pages/categoryMaster';
import SalutationMaster from './pages/salutationMaster';
import TagMaster from './pages/tagMaster';
import CustomerMaster from './pages/customerMaster';
import RegionMaster from './pages/regionMaster';
import { Outlet } from 'react-router-dom';
import TypeMaster from './pages/typeMaster';
import DesignationMaster from './pages/designationMaster';
import UnitMaster from './pages/unitMaster';
import LoginDetails from './pages/loginDetails';
import LocationMaster from './pages/locationMaster';
import PasswordChange from './pages/passwordChange';
import warehouse from './pages/warehouse';
import AssignMaster from './pages/assignMaster';
import EnquiryMaster from './pages/enquiryMaster';
import MyProfile from './pages/myprofile';
import DefectiveItems from './pages/defectiveItems';
import LowStock from './pages/lowStock';
import DefectiveReport from './pages/defectiveReport';

function App() {
  return (
    <Router>
      <Routes>
          {/* <Route path="/" element={<Home />} /> */}
          <Route path="/" element={<Login />} />
        {/* ✅ Public Login Route */}
        {/* <Route path="/login" element={<Login />} /> */}
     

        {/* ✅ Protected Routes (after login) */}
        <Route path="/" element={<MainLayoutWrapper />}>
          <Route path="dashboard" element={<DashboardPg />} />
          {/* <Route path="menu-manager" element={<MenuManager />} /> */}
          <Route path="change-password" element={<PasswordChange />} />
          <Route path="myprofile" element={<MyProfile />} />
          <Route path="location" element={<LocationMaster />} />
          <Route path="logindetails" element={<LoginDetails />} />
          <Route path="defective-report" element={<DefectiveReport />} />
          <Route path="email-marketing" element={<EmailMarketing />} />
          <Route path="settings" element={<SettingsPg />} />
          <Route path="low-stock" element={<LowStock />} />
          <Route path="products" element={<ProductMaster />} />
          <Route path="defective-items" element={<DefectiveItems />} />
          <Route path="assign-master" element={<AssignMaster />} />
          <Route path="enquiry-master" element={<EnquiryMaster />} />
          <Route path="products-category" element={<ProductCategoryMaster />} />
          <Route path="warehouse" element={<warehouse />} />
          <Route path="make" element={<MakeMaster />} />
          <Route path="state" element={<StateMaster />} />
          <Route path="country" element={<CountryMaster />} />
          <Route path="bank" element={<BankMaster />} />
          <Route path="vendor" element={<VendorMaster />} />
          <Route path="company" element={<CompanyMaster />} />
          <Route path="region" element={<RegionMaster />} />
          <Route path="department" element={<DepartmentMaster />} />
          <Route path="designation" element={<DesignationMaster />} />
          <Route path="tag" element={<TagMaster />} />
          <Route path="salutation" element={<SalutationMaster />} />
          <Route path="type" element={<TypeMaster />} />
          <Route path="customer-report" element={<CustomerReport />} />
          <Route path="company-category" element={<CategoryMaster />} />
          <Route path="stock-summary" element={<Stocksummary />} />
          <Route path="out-of-stock" element={<OutOfStock />} />
          <Route path="stock" element={<Stock />} />
          <Route path="stock-in" element={<StockIn />} />
          <Route path="stock-out" element={<StockOut />} />
          <Route path="daily-stock" element={<DailyStockReport />} />
          <Route path="daily-stock-in" element={<DailyStockIn />} />
          <Route path="daily-stock-out" element={<DailyStockOut />} />
          <Route path="users" element={<Users />} />
          <Route path="unit" element={<UnitMaster />} />
          <Route path="customers" element={<CustomerMaster />} />
          <Route path="product-in-out" element={<ProductInOut />} />
          </Route>
      </Routes>
    </Router>
  );
}

// ✅ Wrapper to use MainLayout with Outlet
const MainLayoutWrapper = () => (
  <MainLayout>
    <Outlet />
  </MainLayout>
);

export default App;
