import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import MobileApp from "./mobile/MobileApp.jsx";
import TvApp from "./tv/TvApp.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MobileApp />} />
        <Route path="/tv" element={<TvApp />} />
        <Route path="*" element={<MobileApp />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>
);
