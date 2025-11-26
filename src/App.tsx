import { createContext, useContext, useState, type ReactNode } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/common/Header";
import LicenseFileUpload from "@/features/license/LicenseFileUpload";
import TemplateFileUpload from "@/features/template/TemplateFileUpload";
import AttributesPage from "@/pages/AttributesPage";
import type { OCAPackage } from "@/types/oca";
import "./App.css";


interface AppContextType {
  // License state
  attributes: string[];
  rawJsonData: OCAPackage | null;
  setAttributes: (attributes: string[]) => void;
  setRawJsonData: (data: OCAPackage | null) => void;
}


const AppContext = createContext<AppContextType | undefined>(undefined);


export function useApp(): AppContextType {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within AppProvider");
  }
  return context;
}


function AppProvider({ children }: { children: ReactNode }) {
  // License state
  const [attributes, setAttributes] = useState<string[]>([]);
  const [rawJsonData, setRawJsonData] = useState<OCAPackage | null>(null);

  const value: AppContextType = {
    attributes,
    rawJsonData,
    setAttributes,
    setRawJsonData,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function HomePage() {
  return (
    <>
      <Header />
      <main className="p-4 lg:p-12 flex flex-col gap-6 lg:gap-10">
        <LicenseFileUpload />
        <TemplateFileUpload />
      </main>
    </>
  );
}

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/attributes" element={<AttributesPage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
