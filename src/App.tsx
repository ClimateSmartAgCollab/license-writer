import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/common/Header";
import LicenseFileUpload from "@/features/license/LicenseFileUpload";
import TemplateFileUpload from "@/features/template/TemplateFileUpload";
import {
  initialTemplateState,
  templateReducer,
} from "@/features/template/state/templateStore";
import AttributesPage from "@/pages/AttributesPage";
import type { OCAPackage } from "@/types/oca";
import type {
  BuilderRepeatContext,
  TemplateCommand,
} from "@/types/template-commands";
import "./App.css";


interface AppContextType {
  // License state
  attributes: string[];
  rawJsonData: OCAPackage | null;
  jinjaText: string;
  builderText: string;
  templateWarnings: string[];
  isBuilderLimited: boolean;
  builderWarning: string | null;
  builderRepeatContext: BuilderRepeatContext | null;
  setAttributes: (attributes: string[]) => void;
  setRawJsonData: (data: OCAPackage | null) => void;
  dispatchTemplateCommand: (command: TemplateCommand) => void;
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
  const [templateState, setTemplateState] = useState(initialTemplateState);
  const processedInsertNoncesRef = useRef<Set<string>>(new Set());

  const dispatchTemplateCommand = useCallback((command: TemplateCommand) => {
    if (command.type === "insert_variable" || command.type === "insert_for_block") {
      const nonce = command.payload.insertNonce;
      if (nonce) {
        if (processedInsertNoncesRef.current.has(nonce)) {
          return;
        }
        if (processedInsertNoncesRef.current.size >= 64) {
          const oldest = processedInsertNoncesRef.current.keys().next().value;
          if (oldest !== undefined) {
            processedInsertNoncesRef.current.delete(oldest);
          }
        }
        processedInsertNoncesRef.current.add(nonce);
      }
    }
    setTemplateState((current) => templateReducer(current, command));
  }, []);

  const value: AppContextType = {
    attributes,
    rawJsonData,
    jinjaText: templateState.jinjaText,
    builderText: templateState.builderText,
    templateWarnings: templateState.warnings.map((warning) =>
      warning.detail ? `${warning.message} (${warning.detail})` : warning.message,
    ),
    isBuilderLimited: templateState.isBuilderLimited,
    builderWarning: templateState.builderWarning
      ? templateState.builderWarning.detail
        ? `${templateState.builderWarning.message} (${templateState.builderWarning.detail})`
        : templateState.builderWarning.message
      : null,
    builderRepeatContext: templateState.builderContext,
    setAttributes,
    setRawJsonData,
    dispatchTemplateCommand,
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
