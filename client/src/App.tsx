import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Router as WouterRouter, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Collection from "./pages/Collection";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import OrderLookup from "./pages/OrderLookup";
import Account from "./pages/Account";
import AccountOrder from "./pages/AccountOrder";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Seller from "./pages/Seller";
import Policy from "./pages/Policy";
import Admin from "./pages/Admin";
import AdminProducts from "./pages/AdminProducts";
import AdminOrders from "./pages/AdminOrders";
import AdminCustomers from "./pages/AdminCustomers";
import AdminPromotions from "./pages/AdminPromotions";
import NotFound from "./pages/NotFound";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/collections/:slug" component={Collection} />
    <Route path="/search" component={Collection} />
    <Route path="/products/:slug" component={ProductDetail} />
    <Route path="/cart" component={Cart} />
    <Route path="/checkout" component={Checkout} />
    <Route path="/order-success/:orderId" component={OrderSuccess} />
    <Route path="/orders/lookup" component={OrderLookup} />
    <Route path="/account/orders/:orderId" component={AccountOrder} />
    <Route path="/account/orders" component={Account} />
    <Route path="/account" component={Account} />
    <Route path="/login" component={Login} />
    <Route path="/register" component={Register} />
    <Route path="/admin/products/:id" component={AdminProducts} />
    <Route path="/admin/products" component={AdminProducts} />
    <Route path="/admin/orders" component={AdminOrders} />
    <Route path="/admin/customers" component={AdminCustomers} />
    <Route path="/admin/promotions" component={AdminPromotions} />
    <Route path="/admin" component={Admin} />
    <Route path="/seller" component={Seller} />
    <Route path="/policies/:kind" component={Policy} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  const base = import.meta.env.BASE_URL === "/" ? "" : import.meta.env.BASE_URL.replace(/\/$/, "");
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><WouterRouter base={base}><Router /></WouterRouter></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
