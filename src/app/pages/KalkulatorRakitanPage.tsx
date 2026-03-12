import { useState } from 'react';
import { Monitor, Camera } from 'lucide-react';

interface Component {
  id: string;
  name: string;
  price: number;
}

interface SelectedComponent {
  category: string;
  component: Component | null;
}

const mockComponents: Record<string, Component[]> = {
  Processor: [
    { id: 'cpu1', name: 'AMD Ryzen 5 5600X', price: 2500000 },
    { id: 'cpu2', name: 'Intel Core i5-12400F', price: 2300000 },
    { id: 'cpu3', name: 'AMD Ryzen 7 5800X', price: 3800000 },
    { id: 'cpu4', name: 'Intel Core i7-12700F', price: 4200000 },
  ],
  VGA: [
    { id: 'vga1', name: 'RTX 3060 Ti 8GB', price: 6500000 },
    { id: 'vga2', name: 'RTX 3070 8GB', price: 8200000 },
    { id: 'vga3', name: 'RX 6700 XT 12GB', price: 5800000 },
    { id: 'vga4', name: 'RTX 4060 Ti 8GB', price: 7500000 },
  ],
  RAM: [
    { id: 'ram1', name: 'Kingston Fury 16GB DDR4', price: 850000 },
    { id: 'ram2', name: 'Corsair Vengeance 32GB DDR4', price: 1650000 },
    { id: 'ram3', name: 'G.Skill Trident Z 16GB DDR4', price: 900000 },
  ],
  Storage: [
    { id: 'ssd1', name: 'Samsung 970 EVO 1TB', price: 1600000 },
    { id: 'ssd2', name: 'WD Black SN850 1TB', price: 2000000 },
    { id: 'ssd3', name: 'Crucial P3 Plus 1TB', price: 1200000 },
  ],
  Motherboard: [
    { id: 'mb1', name: 'MSI B550 Gaming Plus', price: 1750000 },
    { id: 'mb2', name: 'ASUS ROG Strix B660-A', price: 2500000 },
    { id: 'mb3', name: 'Gigabyte B550 Aorus Elite', price: 2200000 },
  ],
  PSU: [
    { id: 'psu1', name: 'Corsair CV650 650W', price: 850000 },
    { id: 'psu2', name: 'Seasonic Focus GX-750 750W', price: 1450000 },
    { id: 'psu3', name: 'EVGA SuperNOVA 650W', price: 1200000 },
  ],
  Casing: [
    { id: 'case1', name: 'NZXT H510 Flow', price: 1200000 },
    { id: 'case2', name: 'Lian Li O11 Dynamic', price: 1800000 },
    { id: 'case3', name: 'Fractal Design Meshify C', price: 1400000 },
  ],
};

const categories = Object.keys(mockComponents);

export default function KalkulatorRakitanPage() {
  const [selectedComponents, setSelectedComponents] = useState<Record<string, Component | null>>(
    categories.reduce((acc, cat) => ({ ...acc, [cat]: null }), {})
  );
  const [margin, setMargin] = useState(0);
  const [promo, setPromo] = useState(0);
  const [adminFee, setAdminFee] = useState(0);
  const [otherCosts, setOtherCosts] = useState(0);
  const [screenshotMode, setScreenshotMode] = useState(false);

  const selectComponent = (category: string, component: Component) => {
    setSelectedComponents({ ...selectedComponents, [category]: component });
  };

  const totalModal = Object.values(selectedComponents).reduce(
    (sum, comp) => sum + (comp?.price || 0),
    0
  ) + otherCosts;

  const hargaOffline = totalModal + margin;
  const hargaOnline = hargaOffline + adminFee - promo;

  const hasSelection = Object.values(selectedComponents).some((comp) => comp !== null);

  return (
    <div className={screenshotMode ? 'bg-white' : ''}>
      <div className={`grid ${screenshotMode ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'} gap-4`}>
        {/* Left Column - Form */}
        {!screenshotMode && (
          <div className="space-y-6">
            {/* Component Selection */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-medium text-gray-800 mb-3">Pilih Komponen</h3>
              <div className="space-y-4">
                {categories.map((category) => (
                  <div key={category}>
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      {category}
                    </label>
                    <select
                      value={selectedComponents[category]?.id || ''}
                      onChange={(e) => {
                        const component = mockComponents[category].find(
                          (c) => c.id === e.target.value
                        );
                        if (component) selectComponent(category, component);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                    >
                      <option value="">-- Pilih {category} --</option>
                      {mockComponents[category].map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          {comp.name} - Rp {comp.price.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Settings */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <h3 className="text-base font-medium text-gray-800 mb-3">Pengaturan Harga</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Margin (Rp)
                  </label>
                  <input
                    type="number"
                    value={margin}
                    onChange={(e) => setMargin(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Promo (Rp)
                  </label>
                  <input
                    type="number"
                    value={promo}
                    onChange={(e) => setPromo(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Biaya Admin Marketplace (Rp)
                  </label>
                  <input
                    type="number"
                    value={adminFee}
                    onChange={(e) => setAdminFee(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-2">
                    Biaya Lain (Rp)
                  </label>
                  <input
                    type="number"
                    value={otherCosts}
                    onChange={(e) => setOtherCosts(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={() => setScreenshotMode(!screenshotMode)}
              disabled={!hasSelection}
              className="w-full flex items-center justify-center gap-2 bg-[#3B82F6] text-white py-2 rounded-lg font-medium hover:bg-[#2563EB] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              <Camera size={16} />
              {screenshotMode ? 'Tutup Mode Screenshot' : 'Mode Screenshot'}
            </button>
          </div>
        )}

        {/* Right Column - Preview */}
        <div className={screenshotMode ? 'max-w-2xl mx-auto' : ''}>
          <div className="bg-white rounded-lg border-2 border-gray-200 shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#3B82F6] to-[#2563EB] p-4 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Monitor size={16} />
                <h2 className="text-xl font-semibold">CAHAYA KOMPUTER</h2>
              </div>
              <p className="text-xs text-white/90">Spesifikasi PC Rakitan</p>
            </div>

            {/* Specs List */}
            <div className="p-4 space-y-3">
              {!hasSelection ? (
                <p className="text-center text-gray-500 py-5">
                  Pilih komponen untuk membuat spesifikasi
                </p>
              ) : (
                <>
                  {categories.map((category) => {
                    const component = selectedComponents[category];
                    if (!component) return null;

                    return (
                      <div key={category} className="flex items-start gap-3 py-2 border-b border-gray-100">
                        <span className="text-xs font-medium text-gray-600 min-w-[120px]">
                          {category}:
                        </span>
                        <span className="text-xs text-gray-800 flex-1">{component.name}</span>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Price Section */}
            {hasSelection && (
              <div className="p-4 space-y-4 bg-gray-50">
                {/* Offline Price */}
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-3 rounded-lg border border-green-200">
                  <p className="text-xs font-medium text-green-800 mb-1">Harga Offline</p>
                  <p className="text-2xl font-bold text-green-700">
                    Rp {hargaOffline.toLocaleString('id-ID')}
                  </p>
                </div>

                {/* Online Price */}
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-lg border border-blue-200">
                  <p className="text-xs font-medium text-blue-800 mb-1">Harga Online</p>
                  <p className="text-2xl font-bold text-[#3B82F6]">
                    Rp {hargaOnline.toLocaleString('id-ID')}
                  </p>
                  {promo > 0 && (
                    <p className="text-[11px] text-blue-600 mt-1">Sudah termasuk promo Rp {promo.toLocaleString('id-ID')}</p>
                  )}
                </div>

                {/* Info */}
                <div className="text-center pt-4 border-t border-gray-200">
                  <p className="text-[11px] text-gray-600">
                    Total Modal: Rp {totalModal.toLocaleString('id-ID')}
                  </p>
                  {margin > 0 && (
                    <p className="text-[11px] text-gray-600">
                      Margin: Rp {margin.toLocaleString('id-ID')}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="bg-[#3B82F6] p-3 text-center">
              <p className="text-white text-xs font-medium">
                Hubungi kami untuk info lebih lanjut
              </p>
              <p className="text-white/90 text-[11px] mt-1">
                WA: 0812-3456-7890 | Instagram: @cahaya.komputer
              </p>
            </div>
          </div>

          {screenshotMode && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setScreenshotMode(false)}
                className="bg-gray-800 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition-colors"
              >
                Kembali ke Editor
              </button>
              <p className="text-xs text-gray-600 mt-3">
                Screenshot preview di atas untuk dikirim ke customer
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
