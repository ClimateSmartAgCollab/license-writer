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
import OCAPackageUpload from "@/features/oca/OCAPackageUpload";
import InitialTemplateUpload from "@/features/template/InitialTemplateUpload";
import {
  initialTemplateState,
  templateReducer,
} from "@/features/template/state/templateStore";
import AttributesPage from "@/pages/AttributesPage";
import TemplateEditorPage from "@/pages/TemplateEditorPage";
import type { OCAPackage } from "@/types/oca";
import type {
  BuilderRepeatContext,
  TemplateCommand,
} from "@/types/templateStateAndCommands";
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
    if (
      command.type === "insert_variable" ||
      command.type === "insert_for_block"
    ) {
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
      warning.detail
        ? `${warning.message} (${warning.detail})`
        : warning.message,
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
        <section
          className="mx-auto max-w-3xl w-full rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-800 text-center"
          aria-label="How the two upload options work"
        >
          <p className="font-bold text-[var(--drt-green)] mb-2 text-2xl">
            Two ways to continue
          </p>
          <ul className="inline-block list-disc pl-5 space-y-1.5 text-left">
            <li>
              <span className="font-medium">OCA package</span> — After you
              upload and choose Next, you go to the attribute-assisted template,
              where you can insert fields from your schema.
            </li>
            <li>
              <span className="font-medium">License template</span> —
              Upload an existing template and choose Next to open the
              template-only editor. No OCA package is required.
            </li>
          </ul>
        </section>
        <OCAPackageUpload />
        <InitialTemplateUpload />
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
          <Route path="/template-editor" element={<TemplateEditorPage />} />
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
