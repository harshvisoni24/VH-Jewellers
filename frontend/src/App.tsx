import { Navigate, Route, Routes } from "react-router-dom";
import AuthForm from "./pages/AuthForm";
import Shop from "./pages/Shop";
import Cart from "./pages/Cart";
import Orders from "./pages/Orders";
import AdminLayout from "./pages/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import ProductDetail from "./pages/ProductDetail";
import Wishlist from "./pages/Wishlist";
import AdminProductNew from "./pages/AdminProductNew";
import { AdminQuestions, AdminSettings } from "./pages/AdminMore";
import Profile from "./pages/Profile";
import OrderDetail from "./pages/OrderDetail";
import AdminProductEdit from "./pages/AdminProductEdit";
import Notifications from "./pages/Notifications";
import { AdminCategories, AdminCoupons, AdminCustomers, AdminInventory, AdminReviews } from "./pages/AdminLists";
import RequireRole from "./components/RequireRole";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Shop />} />
      <Route path="/login" element={<AuthForm mode="login" />} />
      <Route path="/register" element={<AuthForm mode="register" />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/products/:id" element={<ProductDetail />} />
      <Route path="/wishlist" element={<RequireRole role="BUYER"><Wishlist /></RequireRole>} />
      <Route path="/notifications" element={<RequireRole role="BUYER"><Notifications /></RequireRole>} />
      <Route path="/profile" element={<RequireRole role="BUYER"><Profile /></RequireRole>} />
      <Route path="/orders/:id" element={<RequireRole role="BUYER"><OrderDetail /></RequireRole>} />
      <Route path="/cart" element={<RequireRole role="BUYER"><Cart /></RequireRole>} />
      <Route path="/orders" element={<RequireRole role="BUYER"><Orders /></RequireRole>} />
      <Route path="/admin" element={<RequireRole role="ADMIN"><AdminLayout /></RequireRole>}>
        <Route index element={<AdminDashboard />} />
        <Route path="products" element={<AdminProducts />} />
        <Route path="products/new" element={<AdminProductNew />} />
        <Route path="products/:id" element={<AdminProductEdit />} />
        <Route path="questions" element={<AdminQuestions />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="categories" element={<AdminCategories />} />
        <Route path="reviews" element={<AdminReviews />} />
        <Route path="notifications" element={<Notifications admin />} />
        <Route path="orders" element={<AdminOrders />} />
        <Route path="inventory" element={<AdminInventory />} />
        <Route path="customers" element={<AdminCustomers />} />
        <Route path="coupons" element={<AdminCoupons />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
