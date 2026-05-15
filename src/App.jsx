import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  BookOpen,
  Clock3,
  Flower2,
  Pencil,
  Save,
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  ImagePlus,
  Plus,
  Trash2,
  CalendarDays,
} from "lucide-react";

const STORAGE_KEY = "anniversary_surprise_web_data_v1";
const AUTH_STORAGE_KEY = "anniversary_surprise_login_v1";
const FIRESTORE_COLLECTION = "anniversary";
const FIRESTORE_DOCUMENT = "main";

// ตอนเข้าเว็บให้กรอก Name / Password ให้ตรงกับในนี้
const ALLOWED_USERS = [
  { name: "Auto", password: "160326" },
  { name: "love", password: "160326" },
];

const defaultData = {
  startDate: "2026-03-16",
  pages: [
    {
      title: "Our First Day",
      content: "เขียนเรื่องราววันแรกที่เราเริ่มคบกันตรงนี้...",
      imageUrl:
        "https://images.unsplash.com/photo-1518199266791-5375a83190b7?q=80&w=900&auto=format&fit=crop",
    },
    {
      title: "My Favorite Memory",
      content: "ความทรงจำที่ชอบที่สุดของเราสองคน...",
      imageUrl:
        "https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?q=80&w=900&auto=format&fit=crop",
    },
    {
      title: "A Little Promise",
      content: "คำสัญญาเล็ก ๆ ที่อยากบอกแฟน...",
      imageUrl:
        "https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?q=80&w=900&auto=format&fit=crop",
    },
  ],
};

function loadSavedData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return defaultData;
    const parsed = JSON.parse(saved);

    return {
      startDate: parsed.startDate || defaultData.startDate,
      pages: Array.isArray(parsed.pages) && parsed.pages.length > 0 ? parsed.pages : defaultData.pages,
    };
  } catch {
    return defaultData;
  }
}

function calculateLoveTime(startDateString) {
  const start = new Date(startDateString);
  const now = new Date();

  if (Number.isNaN(start.getTime())) {
    return {
      totalDays: 0,
      totalWeeks: 0,
      totalMonths: 0,
      years: 0,
      months: 0,
      weeks: 0,
      days: 0,
    };
  }

  const diffMs = now.getTime() - start.getTime();
  const totalDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  const years = Math.floor(totalDays / 365);
  const months = Math.floor((totalDays % 365) / 30);
  const weeks = Math.floor(((totalDays % 365) % 30) / 7);
  const days = ((totalDays % 365) % 30) % 7;

  return {
    totalDays,
    totalWeeks: Math.floor(totalDays / 7),
    totalMonths: Math.floor(totalDays / 30),
    years,
    months,
    weeks,
    days,
  };
}

export default function App() {
  const [activeModal, setActiveModal] = useState(null);
  const [startDate, setStartDate] = useState(defaultData.startDate);
  const [pages, setPages] = useState(defaultData.pages);
  const [pageIndex, setPageIndex] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftPage, setDraftPage] = useState(defaultData.pages[0]);
  const [savedMessage, setSavedMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem(AUTH_STORAGE_KEY) === "true");
  const [currentUserName, setCurrentUserName] = useState(() => localStorage.getItem(`${AUTH_STORAGE_KEY}_name`) || "");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const hasLoadedData = useRef(false);

  useEffect(() => {
    async function loadFirebaseData() {
      try {
        const docRef = doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT);
        const snapshot = await getDoc(docRef);

        if (snapshot.exists()) {
          const data = snapshot.data();
          const loadedData = {
            startDate: data.startDate || defaultData.startDate,
            pages: Array.isArray(data.pages) && data.pages.length > 0 ? data.pages : defaultData.pages,
          };

          setStartDate(loadedData.startDate);
          setPages(loadedData.pages);
          setDraftPage(loadedData.pages[0]);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(loadedData));
        } else {
          await setDoc(docRef, defaultData);
          setStartDate(defaultData.startDate);
          setPages(defaultData.pages);
          setDraftPage(defaultData.pages[0]);
        }
      } catch (error) {
        console.error("Firebase load error:", error);
        const saved = loadSavedData();
        setStartDate(saved.startDate);
        setPages(saved.pages);
        setDraftPage(saved.pages[0]);
        showSavedMessage("โหลด Firebase ไม่ได้ ใช้ข้อมูลในเครื่องแทน");
      } finally {
        hasLoadedData.current = true;
        setIsLoading(false);
      }
    }

    loadFirebaseData();
  }, []);

  useEffect(() => {
    if (!hasLoadedData.current) return;

    const dataToSave = { startDate, pages };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));

    const saveTimer = setTimeout(async () => {
      try {
        await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), dataToSave, { merge: true });
      } catch (error) {
        console.error("Firebase save error:", error);
      }
    }, 500);

    return () => clearTimeout(saveTimer);
  }, [startDate, pages]);

  const loveTime = useMemo(() => calculateLoveTime(startDate), [startDate]);
  const currentPage = pages[pageIndex] || pages[0];

  function showSavedMessage(text = "Saved successfully") {
    setSavedMessage(text);
    setTimeout(() => setSavedMessage(""), 1800);
  }

  function handleLogin(event) {
    event.preventDefault();

    const foundUser = ALLOWED_USERS.find(
      (user) =>
        user.name.toLowerCase() === loginName.trim().toLowerCase() &&
        user.password === loginPassword
    );

    if (!foundUser) {
      setLoginError("ชื่อหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    localStorage.setItem(AUTH_STORAGE_KEY, "true");
    localStorage.setItem(`${AUTH_STORAGE_KEY}_name`, foundUser.name);
    setCurrentUserName(foundUser.name);
    setIsLoggedIn(true);
    setLoginName("");
    setLoginPassword("");
    setLoginError("");
    showSavedMessage(`Welcome ${foundUser.name}`);
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(`${AUTH_STORAGE_KEY}_name`);
    setIsLoggedIn(false);
    setCurrentUserName("");
    setActiveModal(null);
    setIsEditing(false);
  }

  async function saveDataToFirebase(nextData, successText = "บันทึกลง Firebase แล้ว") {
    try {
      await setDoc(doc(db, FIRESTORE_COLLECTION, FIRESTORE_DOCUMENT), nextData, { merge: true });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      showSavedMessage(successText);
      return true;
    } catch (error) {
      console.error("Firebase save error:", error);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
      showSavedMessage("บันทึกลง Firebase ไม่ได้ แต่เก็บในเครื่องไว้ก่อน");
      return false;
    }
  }

  function openBook() {
    setDraftPage(currentPage);
    setIsEditing(false);
    setActiveModal("book");
  }

  function openClock() {
    setActiveModal("clock");
  }

  function closeModal() {
    setActiveModal(null);
    setIsEditing(false);
  }

  function goPage(direction) {
    const nextIndex = direction === "next" ? pageIndex + 1 : pageIndex - 1;
    const safeIndex = Math.min(Math.max(nextIndex, 0), pages.length - 1);
    setPageIndex(safeIndex);
    setDraftPage(pages[safeIndex]);
    setIsEditing(false);
  }

  async function savePage() {
    const nextPages = [...pages];
    nextPages[pageIndex] = draftPage;
    const nextData = { startDate, pages: nextPages };

    setPages(nextPages);
    setIsEditing(false);
    await saveDataToFirebase(nextData, "บันทึกหน้านี้ลง Firebase แล้ว");
  }

  async function addNewPage() {
    const newPage = {
      title: "New Memory",
      content: "เขียนความทรงจำใหม่ตรงนี้...",
      imageUrl:
        "https://firebasestorage.googleapis.com/v0/b/coffee-project-bbe22.firebasestorage.app/o/Oink%20Oink.jpg?alt=media&token=e84c2cce-70b6-492e-8192-4fa40c33252f",
    };
    const nextPages = [...pages, newPage];
    const nextData = { startDate, pages: nextPages };

    setPages(nextPages);
    setPageIndex(nextPages.length - 1);
    setDraftPage(newPage);
    setIsEditing(true);
    await saveDataToFirebase(nextData, "เพิ่มหน้าใหม่ลง Firebase แล้ว");
  }

  async function deleteCurrentPage() {
    if (pages.length <= 1) {
      showSavedMessage("ต้องเหลืออย่างน้อย 1 หน้า");
      return;
    }

    const nextPages = pages.filter((_, index) => index !== pageIndex);
    const nextIndex = Math.max(0, pageIndex - 1);
    const nextData = { startDate, pages: nextPages };

    setPages(nextPages);
    setPageIndex(nextIndex);
    setDraftPage(nextPages[nextIndex]);
    setIsEditing(false);
    await saveDataToFirebase(nextData, "ลบหน้าและบันทึกลง Firebase แล้ว");
  }

  function handleUploadImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setDraftPage((prev) => ({ ...prev, imageUrl: reader.result }));
    };
    reader.readAsDataURL(file);
  }

  async function saveStartDate() {
    await saveDataToFirebase({ startDate, pages }, "บันทึกวันเริ่มคบลง Firebase แล้ว");
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-100 via-pink-50 to-amber-100 text-center">
        <div className="rounded-3xl bg-white/80 px-8 py-6 shadow-2xl">
          <p className="text-lg font-black text-rose-500">Loading anniversary memories...</p>
          <p className="mt-2 text-sm font-bold text-stone-500">กำลังโหลดข้อมูลจาก Firebase</p>
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-rose-100 via-pink-50 to-amber-100 px-4 text-stone-800">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-[2rem] bg-white/85 p-8 shadow-2xl ring-1 ring-white/80 backdrop-blur"
        >
          <div className="mb-6 text-center">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.35em] text-rose-500">
              Anniversary Desk
            </p>
            <h1
               className="text-4xl font-black"
              style={{ color: "#ff4f8b" }}
                >
              Welcome
            </h1>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-stone-600">Name</label>
              <input
                value={loginName}
                onChange={(event) => setLoginName(event.target.value)}
                className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="Username"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-stone-600">Password</label>
              <input
                type="password"
                value={loginPassword}
                onChange={(event) => setLoginPassword(event.target.value)}
                className="w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 font-bold outline-none focus:ring-2 focus:ring-rose-300"
                placeholder="ใส่รหัสผ่าน"
              />
            </div>

            {loginError && (
              <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-500">
                {loginError}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-rose-500 px-5 py-3 font-black text-white shadow-lg transition hover:bg-rose-600"
            >
              Enter Our Desk
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-hidden bg-gradient-to-br from-rose-100 via-pink-50 to-amber-100 text-stone-800">
      <div className="fixed right-5 top-5 z-[70] flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-bold text-stone-600 shadow-lg backdrop-blur">
        <span>{currentUserName || "login"}</span>
        <button
          onClick={handleLogout}
          className="rounded-full bg-rose-500 px-3 py-1 text-xs font-black text-white hover:bg-rose-600"
        >
          Logout
        </button>
      </div>

      <AnimatePresence>
        {savedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed left-1/2 top-5 z-[80] -translate-x-1/2 rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white shadow-2xl"
          >
            {savedMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <p className="mb-2 text-sm font-bold uppercase tracking-[0.45em] text-rose-500">
            Anniversary Surprise
          </p>
          <h1
            className="text-4xl font-black drop-shadow-sm md:text-6xl"
             style={{ color: "#ff4f8b" }}
            >
            Love Desk
          </h1>
          
        </motion.div>

        <div className="relative h-[560px] w-full max-w-5xl rounded-[3rem] bg-amber-100/80 p-6 shadow-2xl ring-1 ring-white/80">
          <div className="absolute inset-x-10 bottom-14 h-64 rounded-[2.5rem] bg-gradient-to-br from-amber-700 via-orange-600 to-orange-800 shadow-2xl" />
          <div className="absolute inset-x-12 bottom-20 h-8 rounded-full bg-white/20 blur-xl" />

          <motion.button
            whileHover={{ scale: 1.04, rotate: -1, y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={openBook}
            className="absolute bottom-28 left-[37%] z-10 h-72 w-48 -translate-x-1/2 text-left transition"
            aria-label="Open memory book"
          >
            <div className="relative h-full w-full">
              <div className="absolute inset-x-4 bottom-0 h-8 rounded-full bg-stone-900/20 blur-md" />

              <div className="absolute left-4 top-4 h-64 w-40 rotate-[-3deg] rounded-r-3xl rounded-l-xl bg-amber-50 shadow-2xl ring-1 ring-amber-200">
                <div className="absolute right-0 top-4 h-56 w-5 rounded-r-2xl bg-gradient-to-r from-amber-100 to-white" />
                <div className="absolute right-4 top-9 h-[1px] w-28 bg-amber-200/80" />
                <div className="absolute right-4 top-14 h-[1px] w-28 bg-amber-200/80" />
                <div className="absolute right-4 top-19 h-[1px] w-28 bg-amber-200/80" />
                <div className="absolute right-4 top-24 h-[1px] w-28 bg-amber-200/80" />
              </div>

              <div className="absolute left-0 top-0 h-64 w-40 rotate-[-3deg] overflow-hidden rounded-r-3xl rounded-l-xl bg-gradient-to-br from-rose-300 via-pink-300 to-rose-500 shadow-2xl ring-4 ring-white/70">
                <div className="absolute left-0 top-0 h-full w-9 bg-gradient-to-r from-rose-800/35 to-rose-400/10" />
                <div className="absolute left-9 top-0 h-full w-[2px] bg-white/35" />
                <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/20" />
                <div className="absolute -bottom-8 right-4 h-28 w-28 rounded-full bg-rose-100/20" />

                <div className="absolute left-10 top-10 right-5 rounded-2xl border-2 border-white/70 bg-white/30 px-4 py-5 text-center backdrop-blur-sm">
                  <BookOpen className="mx-auto mb-2 text-white" size={28} />
                  <span className="text-xs font-black uppercase tracking-wider text-white">Memory Book</span>
                  <h2 className="mt-3 text-3xl font-black leading-none text-white drop-shadow">Our<br />Story</h2>
                  <p className="mt-3 text-[11px] font-bold text-white/90">คลิกเพื่อเปิดหนังสือ</p>
                </div>

                <div className="absolute bottom-0 right-8 h-20 w-6 rounded-t-sm bg-rose-700/75 shadow-lg" />
                <div className="absolute bottom-0 right-8 h-0 w-0 border-l-[12px] border-r-[12px] border-t-[14px] border-l-transparent border-r-transparent border-t-rose-200" />
              </div>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -5 }}
            whileTap={{ scale: 0.98 }}
            onClick={openClock}
            className="absolute bottom-40 right-16 z-10 h-40 w-72 text-left transition"
            aria-label="Open love clock"
          >
            <div className="relative h-full w-full">
              <div className="absolute inset-x-8 bottom-[-10px] h-7 rounded-full bg-stone-900/20 blur-md" />

              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-white via-stone-50 to-stone-100 shadow-2xl ring-2 ring-white/90" />
              <div className="absolute -bottom-4 left-8 h-12 w-6 -skew-x-12 rounded bg-stone-200 shadow" />
              <div className="absolute -bottom-4 right-8 h-12 w-6 skew-x-12 rounded bg-stone-200 shadow" />

              <div className="absolute left-5 right-5 top-5 rounded-xl bg-slate-200 px-4 py-4 shadow-inner ring-1 ring-slate-300">
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-slate-700">
                  <div>
                    <p className="text-3xl font-black leading-none">{loveTime.years}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Year</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black leading-none">{loveTime.months}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Month</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black leading-none">{loveTime.weeks}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Week</p>
                  </div>
                  <div>
                    <p className="text-3xl font-black leading-none">{loveTime.days}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase text-slate-500">Day</p>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-300 pt-2 text-center font-mono text-[11px] font-bold text-slate-500">
                  Since 16/03/2026
                </div>
              </div>

              
            </div>
          </motion.button>

          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="absolute right-20 top-16 rounded-3xl bg-white/80 px-5 py-3 shadow-xl backdrop-blur"
          >
            <div className="flex items-center gap-2 text-rose-500">
              <Heart fill="currentColor" size={18} />
              <span className="font-bold">For You na Kon Suay</span>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {activeModal === "book" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="relative grid max-h-[92vh] w-full max-w-5xl gap-0 overflow-y-auto rounded-[2rem] bg-amber-50 shadow-2xl md:grid-cols-2"
            >
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 z-20 rounded-full bg-white/90 p-2 text-stone-600 shadow hover:bg-white"
              >
                <X size={20} />
              </button>

              <div className="relative min-h-[480px] bg-gradient-to-br from-rose-100 to-amber-100 p-8">
                {isEditing ? (
                  <div className="flex h-full flex-col justify-center">
                    <label className="mb-2 text-sm font-bold text-stone-600">Image URL</label>
                    <input
                      value={draftPage.imageUrl || ""}
                      onChange={(event) => setDraftPage({ ...draftPage, imageUrl: event.target.value })}
                      className="mb-4 rounded-2xl border border-rose-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-rose-300"
                      placeholder="วางลิงก์รูปภาพตรงนี้"
                    />

                    <label className="mb-2 text-sm font-bold text-stone-600">Upload image from computer</label>
                    <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-rose-300 bg-white/80 px-4 py-6 text-sm font-bold text-rose-500 hover:bg-white">
                      <ImagePlus size={20} />
                      เลือกรูปภาพ
                      <input type="file" accept="image/*" className="hidden" onChange={handleUploadImage} />
                    </label>

                    {draftPage.imageUrl && (
                      <img
                        src={draftPage.imageUrl}
                        alt="preview"
                        className="mt-5 h-56 w-full rounded-3xl object-cover shadow-xl"
                      />
                    )}
                  </div>
                ) : (
                  <img
                    src={currentPage.imageUrl}
                    alt={currentPage.title}
                    className="h-full min-h-[420px] w-full rounded-[1.5rem] object-cover shadow-xl"
                  />
                )}
              </div>

              <div className="flex min-h-[480px] flex-col justify-between bg-[linear-gradient(90deg,rgba(120,53,15,0.08)_0,rgba(255,251,235,1)_8%)] p-8">
                <div>
                  <div className="mb-4 flex items-center justify-between gap-3 pr-10">
                    <p className="text-sm font-bold uppercase tracking-[0.25em] text-pink-600">
                      Page {pageIndex + 1} / {pages.length}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={addNewPage}
                        className="rounded-full bg-white p-2 text-rose-500 shadow hover:bg-rose-50"
                        title="Add page"
                      >
                        <Plus size={18} />
                      </button>
                      <button
                        onClick={deleteCurrentPage}
                        className="rounded-full bg-white p-2 text-red-500 shadow hover:bg-red-50"
                        title="Delete page"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <>
                      <label className="mb-2 block text-sm font-bold text-stone-600">Title</label>
                      <input
                        value={draftPage.title || ""}
                        onChange={(event) => setDraftPage({ ...draftPage, title: event.target.value })}
                        className="mb-4 w-full rounded-2xl border border-rose-200 bg-white px-4 py-3 text-2xl font-black outline-none focus:ring-2 focus:ring-rose-300"
                      />
                      <label className="mb-2 block text-sm font-bold text-stone-600">Content</label>
                      <textarea
                        value={draftPage.content || ""}
                        onChange={(event) => setDraftPage({ ...draftPage, content: event.target.value })}
                        className="h-56 w-full resize-none rounded-2xl border border-rose-200 bg-white px-4 py-3 leading-8 outline-none focus:ring-2 focus:ring-rose-300"
                      />
                    </>
                  ) : (
                    <>
                      <h2
                        className="select-none text-4xl font-black"
                        style={{ color: "#be185d" }}
                      >
                        {currentPage.title}
                      </h2>
                      <p className="mt-6 whitespace-pre-line text-lg leading-9 text-stone-600">{currentPage.content}</p>
                    </>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => goPage("prev")}
                      disabled={pageIndex === 0}
                      className="rounded-full bg-white px-4 py-3 shadow disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() => goPage("next")}
                      disabled={pageIndex === pages.length - 1}
                      className="rounded-full bg-white px-4 py-3 shadow disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </div>

                  {isEditing ? (
                    <button
                      onClick={savePage}
                      className="flex items-center gap-2 rounded-full bg-rose-400 px-5 py-3 font-bold text-white shadow-lg hover:bg-rose-500"
                    >
                      <Save size={18} /> Save
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setDraftPage(currentPage);
                        setIsEditing(true);
                      }}
                      className="flex items-center gap-2 rounded-full bg-stone-800 px-5 py-3 font-bold text-white shadow-lg hover:bg-stone-700"
                    >
                      <Pencil size={18} /> Edit
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {activeModal === "clock" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 30 }}
              className="relative w-full max-w-2xl rounded-[2rem] bg-white p-8 text-center shadow-2xl"
            >
              <button
                onClick={closeModal}
                className="absolute right-4 top-4 rounded-full bg-stone-100 p-2 text-stone-600 hover:bg-stone-200"
              >
                <X size={20} />
              </button>

              <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-rose-100 text-rose-500">
                <Clock3 size={52} />
              </div>

              <p className="text-sm font-bold uppercase tracking-[0.3em] text-rose-400">Together since</p>

              <div className="mx-auto mt-4 max-w-sm rounded-2xl bg-rose-50 p-4 text-center">
                <p className="text-2xl font-black text-stone-700">16 March 2026</p>
                <p className="mt-1 text-sm font-bold text-stone-500">วันที่เริ่มคบกัน</p>
              </div>

              <h2 className="mt-6 text-4xl font-black text-stone-800">We have been together for</h2>

              <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
                <TimeCard label="Years" value={loveTime.years} />
                <TimeCard label="Months" value={loveTime.months} />
                <TimeCard label="Weeks" value={loveTime.weeks} />
                <TimeCard label="Days" value={loveTime.days} />
              </div>

              <div className="mt-8 rounded-3xl bg-rose-50 p-5 font-medium text-stone-600">
                <p>รวมทั้งหมด {loveTime.totalDays} วัน</p>
                <p className="mt-1 text-sm">
                  ประมาณ {loveTime.totalWeeks} สัปดาห์ หรือ {loveTime.totalMonths} เดือน
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TimeCard({ label, value }) {
  return (
    <div className="rounded-3xl bg-gradient-to-br from-rose-100 to-amber-100 p-5 shadow-inner">
      <p className="text-4xl font-black text-rose-500">{value}</p>
      <p className="mt-1 text-sm font-bold uppercase tracking-wider text-stone-500">{label}</p>
    </div>
  );
}
