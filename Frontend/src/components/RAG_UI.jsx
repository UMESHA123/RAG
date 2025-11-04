import React, { useState, useRef, useEffect } from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  FileText,
  Upload,
  CheckCircle,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import axios from "axios";
import { Atom } from "react-loading-indicators";

export default function PDFSearchUI() {
  const [pdfFile, setPdfFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [tabs, setTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [visibleTabs, setVisibleTabs] = useState([]);
  const [overflowTabs, setOverflowTabs] = useState([]);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [overflowSearch, setOverflowSearch] = useState("");
  const [overflowPage, setOverflowPage] = useState(0);
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [loading, setLoading] = useState(false);

  const tabsContainerRef = useRef(null);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    calculateVisibleTabs();
  }, [tabs]);

  useEffect(() => {
    const handleResize = () => calculateVisibleTabs();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [tabs]);

  const calculateVisibleTabs = () => {
    if (!tabsContainerRef.current || tabs.length === 0) {
      setVisibleTabs(tabs);
      setOverflowTabs([]);
      return;
    }

    const containerWidth = tabsContainerRef.current.offsetWidth - 50;
    const tabWidth = 180;
    const maxVisibleTabs = Math.floor(containerWidth / tabWidth);

    if (maxVisibleTabs >= tabs.length) {
      setVisibleTabs(tabs);
      setOverflowTabs([]);
    } else {
      setVisibleTabs(tabs.slice(0, maxVisibleTabs));
      setOverflowTabs(tabs.slice(maxVisibleTabs));
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = e.dataTransfer.files;
    if (files && files[0] && files[0].type === "application/pdf") {
      setPdfFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const file = e.target.files[0];
    if (file && file.type === "application/pdf") {
      setPdfFile(file);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    try {
        setLoading(true);
      const res = await axios.post(
        "http://localhost:3002/query",
        { question: searchQuery },
        {
          headers: { "Content-Type": "application/json" },
        }
      );
      let newTab= {}
      console.log("Search response:", res.data);
      if (res.status === 200) {
        
        newTab = {
          id: Date.now(),
          query: searchQuery,
          results: res.data.answer,
          timestamp: new Date().toLocaleTimeString(),
        };
      }
      setTabs([...tabs, newTab]);
      setActiveTab(newTab.id);
      setSearchQuery("");
      setOverflowPage(0);
    } catch (error) {
      console.log("error while searching:", error);
    } finally{
        setLoading(false);
    }
  };

  const closeTab = (tabId, e) => {
    e.stopPropagation();
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    if (activeTab === tabId) {
      setActiveTab(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const filteredOverflowTabs = overflowTabs.filter((tab) =>
    tab.query.toLowerCase().includes(overflowSearch.toLowerCase())
  );

  const paginatedOverflowTabs = filteredOverflowTabs.slice(
    overflowPage * ITEMS_PER_PAGE,
    (overflowPage + 1) * ITEMS_PER_PAGE
  );

  const totalPages = Math.ceil(filteredOverflowTabs.length / ITEMS_PER_PAGE);

  const activeTabData = tabs.find((t) => t.id === activeTab);
  console.log(pdfFile);

  const handlePdfUpload = async () => {
    try {
      setLoading(true);
      const formData = new FormData();
      formData.append("pdfFile", pdfFile); // key must match the backend field name

      const res = await axios.post("http://localhost:3002/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("PDF upload response:", res.data);
    } catch (error) {
      console.log("error while uploading pdf:", error);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 overflow-hidden">
      {/* Left Side - PDF Upload (Collapsible) */}
      <div
        className={`transition-all duration-300 flex-shrink-0 ${
          showUploadPanel ? "w-full lg:w-96" : "w-0"
        } overflow-hidden border-r border-gray-200 bg-white/80 backdrop-blur-sm`}
      >
        <div className="h-full overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                Document Upload
              </h2>
              <p className="text-gray-600 text-sm mt-1">Upload your PDF file</p>
            </div>
            <button
              onClick={() => setShowUploadPanel(false)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors lg:hidden"
              title="Close panel"
            >
              <PanelLeftClose className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          <div
            className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
              dragActive
                ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-lg"
                : pdfFile
                ? "border-green-400 bg-gradient-to-br from-green-50 to-emerald-50"
                : "border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50/50"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileInput}
              className="hidden"
              id="pdf-input"
            />

            {!pdfFile ? (
              <label htmlFor="pdf-input" className="cursor-pointer block">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 blur-2xl"></div>
                  <Upload className="w-20 h-20 mx-auto mb-4 text-blue-500 relative animate-bounce" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Drop your PDF here
                </h3>
                <p className="text-base text-gray-600 mb-4">
                  or click to browse from your device
                </p>
                <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg text-sm font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg">
                  <FileText className="w-4 h-4 mr-2" />
                  Select PDF File
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Maximum file size: 10MB
                </p>
              </label>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <CheckCircle className="w-20 h-20 mx-auto text-green-500 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-1">
                    Upload Successful!
                  </h3>
                  <p className="text-sm text-gray-600">
                    Your document is ready
                  </p>
                </div>
              </div>
            )}
          </div>

          {pdfFile && (
            <div className="mt-6 p-5 bg-white border border-green-200 rounded-xl shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center shadow-md">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate text-base">
                    {pdfFile.name}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                      PDF Document
                    </span>
                    <span className="text-xs text-gray-500">
                      {(pdfFile.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="mt-3 bg-green-100 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 to-emerald-500 h-full w-full animate-pulse"></div>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <button
                    onClick={() => setPdfFile(null)}
                    className="flex-shrink-0 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handlePdfUpload()}
                    className="flex-shrink-0 p-2 text-black-500 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Remove file"
                  >
                    {/* <Trash2 className="w-5 h-5" /> */}
                    {loading ? "Uploading..." : "Upload"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div className="mt-8 grid grid-cols-1 gap-4">
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                <Search className="w-5 h-5 text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-800 text-sm mb-1">
                Smart Search
              </h4>
              <p className="text-xs text-gray-600">
                Find content instantly within your documents
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3">
                <FileText className="w-5 h-5 text-indigo-600" />
              </div>
              <h4 className="font-semibold text-gray-800 text-sm mb-1">
                Multi-Tab
              </h4>
              <p className="text-xs text-gray-600">
                Manage multiple searches simultaneously
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Search and Results */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Search Section */}
        <div className="p-4 md:p-6 bg-white/90 backdrop-blur-sm border-b border-gray-200 shadow-sm flex-shrink-0">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setShowUploadPanel(!showUploadPanel)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 text-gray-700"
                title={
                  showUploadPanel ? "Hide upload panel" : "Show upload panel"
                }
              >
                {showUploadPanel ? (
                  <PanelLeftClose className="w-5 h-5" />
                ) : (
                  <PanelLeftOpen className="w-5 h-5" />
                )}
                <span className="text-sm font-medium hidden sm:inline">
                  {showUploadPanel ? "Hide" : "Upload"}
                </span>
              </button>
              <h2 className="text-xl md:text-2xl font-bold text-gray-800">
                Search Content
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-blue-500 transition-colors" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="Enter your search query..."
                  className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={!searchQuery.trim()}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Search
              </button>
            </div>
          </div>
        </div>

        {/* Tabs Section */}
        {tabs.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm border-b border-gray-200 px-4 md:px-6 shadow-sm flex-shrink-0">
            <div
              className="flex items-center max-w-full"
              ref={tabsContainerRef}
            >
              <div className="flex-1 flex overflow-hidden">
                {visibleTabs.map((tab) => (
                  <div
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-3 md:px-4 py-3 cursor-pointer border-b-2 transition-all min-w-[140px] md:min-w-[180px] ${
                      activeTab === tab.id
                        ? "border-blue-600 bg-gradient-to-t from-blue-50 to-transparent text-blue-700 shadow-sm"
                        : "border-transparent hover:bg-gray-50 text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    <span className="truncate flex-1 text-xs md:text-sm font-medium">
                      {tab.query}
                    </span>
                    <button
                      onClick={(e) => closeTab(tab.id, e)}
                      className="hover:bg-white/80 rounded-full p-1 transition-colors"
                    >
                      <X className="w-3 h-3 md:w-4 md:h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Overflow Menu */}
              {overflowTabs.length > 0 && (
                <div className="relative ml-2">
                  <button
                    onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                    className="px-3 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 rounded-lg text-xs md:text-sm font-medium text-gray-700 shadow-sm transition-all whitespace-nowrap"
                  >
                    +{overflowTabs.length}
                  </button>

                  {showOverflowMenu && (
                    <div className="absolute right-0 mt-2 w-72 md:w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-10 overflow-hidden">
                      <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <input
                          type="text"
                          value={overflowSearch}
                          onChange={(e) => {
                            setOverflowSearch(e.target.value);
                            setOverflowPage(0);
                          }}
                          placeholder="Search tabs..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="max-h-64 overflow-y-auto">
                        {paginatedOverflowTabs.length > 0 ? (
                          paginatedOverflowTabs.map((tab) => (
                            <div
                              key={tab.id}
                              onClick={() => {
                                setActiveTab(tab.id);
                                setShowOverflowMenu(false);
                              }}
                              className="flex items-center justify-between px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 cursor-pointer border-b border-gray-100 transition-all"
                            >
                              <span className="text-sm text-gray-700 truncate flex-1 font-medium">
                                {tab.query}
                              </span>
                              <button
                                onClick={(e) => {
                                  closeTab(tab.id, e);
                                  if (
                                    paginatedOverflowTabs.length === 1 &&
                                    overflowPage > 0
                                  ) {
                                    setOverflowPage(overflowPage - 1);
                                  }
                                }}
                                className="ml-2 hover:bg-red-100 rounded-full p-1 transition-colors"
                              >
                                <X className="w-4 h-4 text-red-500" />
                              </button>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-gray-500 text-sm">
                            No tabs found
                          </div>
                        )}
                      </div>

                      {totalPages > 1 && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                          <button
                            onClick={() =>
                              setOverflowPage(Math.max(0, overflowPage - 1))
                            }
                            disabled={overflowPage === 0}
                            className="p-1.5 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <span className="text-sm text-gray-600 font-medium">
                            {overflowPage + 1} / {totalPages}
                          </span>
                          <button
                            onClick={() =>
                              setOverflowPage(
                                Math.min(totalPages - 1, overflowPage + 1)
                              )
                            }
                            disabled={overflowPage >= totalPages - 1}
                            className="p-1.5 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Results Section - Now takes remaining height */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className={`max-w-6xl mx-auto h-full ${loading?"flex items-center justify-center h-500":""}`} >

            {loading ? <div ><Atom  color="#0c93e5" size="medium" text="" textColor="" /></div> :activeTabData ? (
              <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8 border border-gray-200 hover:shadow-xl transition-shadow">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-200">
                  <div>
                    <h3 className="text-xl md:text-2xl font-bold text-gray-800 mb-2">
                      {activeTabData.query}
                    </h3>
                    <span className="inline-flex items-center text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                      {activeTabData.timestamp}
                    </span>
                  </div>
                </div>
                <div className="text-gray-700 space-y-4">
                  {/* <p className="text-base">{activeTabData.results}</p> */}
                  <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl border border-blue-200">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                        <Search className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">
                          Search Results
                        </h4>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {activeTabData.results}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional content to demonstrate scrolling */}
                  {/* <div className="space-y-4 mt-8">
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <h5 className="font-semibold text-gray-800 mb-2">
                        Result 1
                      </h5>
                      <p className="text-sm text-gray-600">
                        Sample result content that would appear from your search
                        query. This demonstrates how the scrollable area works
                        with multiple results.
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <h5 className="font-semibold text-gray-800 mb-2">
                        Result 2
                      </h5>
                      <p className="text-sm text-gray-600">
                        Another sample result showing more content. The results
                        area will scroll when content exceeds the available
                        space.
                      </p>
                    </div>
                    <div className="p-4 bg-white border border-gray-200 rounded-lg">
                      <h5 className="font-semibold text-gray-800 mb-2">
                        Result 3
                      </h5>
                      <p className="text-sm text-gray-600">
                        Additional content to demonstrate the scrollable nature
                        of the results container.
                      </p>
                    </div>
                  </div> */}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full min-h-[500px]">
                <div className="text-center">
                  <div className="relative mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full opacity-20 blur-3xl"></div>
                    <Search className="w-20 h-20 mx-auto text-gray-300 relative" />
                  </div>
                  <p className="text-xl font-semibold text-gray-400 mb-2">
                    No active search
                  </p>
                  <p className="text-sm text-gray-500">
                    Enter a query and click Search to begin
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
