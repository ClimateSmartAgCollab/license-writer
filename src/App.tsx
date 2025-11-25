import Header from "@/components/common/Header";
import LicenseFileUpload from "@/features/license/LicenseFileUpload";
import TemplateFileUpload from "@/features/template/TemplateFileUpload";
import "./App.css";

function App() {
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

export default App;
