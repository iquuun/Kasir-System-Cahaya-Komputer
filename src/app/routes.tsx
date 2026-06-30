import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router";
import Root from "./Root";
import PageLoader from "./components/PageLoader";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Lazy load semua halaman agar aplikasi jauh lebih ringan saat pertama kali dibuka
const LoginPage = lazy(() => import("./pages/LoginPage"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const PenjualanPage = lazy(() => import("./pages/PenjualanPage"));
const PembelianPage = lazy(() => import("./pages/PembelianPage"));
const ProdukPage = lazy(() => import("./pages/ProdukPage"));
const StokOpnamePage = lazy(() => import("./pages/StokOpnamePage"));
const GaransiPage = lazy(() => import("./pages/GaransiPage"));
const KalkulatorRakitanPage = lazy(() => import("./pages/KalkulatorRakitanPage"));
const CashFlowPage = lazy(() => import("./pages/CashFlowPage"));
const NilaiAsetPage = lazy(() => import("./pages/NilaiAsetPage"));
const PengaturanPage = lazy(() => import("./pages/PengaturanPage"));
const LaporanLabaPage = lazy(() => import("./pages/LaporanLabaPage"));
const DistributorPage = lazy(() => import("./pages/DistributorPage"));
const HutangDistributorPage = lazy(() => import("./pages/HutangDistributorPage"));

// Helper function untuk membungkus halaman dengan ErrorBoundary & Suspense Loading
const withSuspense = (Component: React.ComponentType) => (
  <ErrorBoundary>
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  </ErrorBoundary>
);

export const router = createBrowserRouter([
  {
    path: "/login",
    element: withSuspense(LoginPage),
  },
  {
    path: "/",
    element: <Root />,
    errorElement: <ErrorBoundary />, // Tangkap error jika layout root gagal
    children: [
      { index: true, element: withSuspense(Dashboard) },
      { path: "penjualan", element: withSuspense(PenjualanPage) },
      { path: "pembelian", element: withSuspense(PembelianPage) },
      { path: "produk", element: withSuspense(ProdukPage) },
      { path: "stok-opname", element: withSuspense(StokOpnamePage) },
      { path: "garansi", element: withSuspense(GaransiPage) },
      { path: "kalkulator", element: withSuspense(KalkulatorRakitanPage) },
      { path: "cash-flow", element: withSuspense(CashFlowPage) },
      { path: "nilai-aset", element: withSuspense(NilaiAsetPage) },
      { path: "pengaturan", element: withSuspense(PengaturanPage) },
      { path: "laporan-laba", element: withSuspense(LaporanLabaPage) },
      { path: "distributor", element: withSuspense(DistributorPage) },
      { path: "hutang-distributor", element: withSuspense(HutangDistributorPage) },
    ],
  },
]);
