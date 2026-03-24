import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/theme";
import Home from "./pages/Home";

export default function App() {
  return (
    <ThemeProvider>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </ThemeProvider>
  );
}
