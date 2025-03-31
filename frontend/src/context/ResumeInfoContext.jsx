import {
  createContext,
  useState,
  useContext,
  useCallback,
  useMemo,
} from "react";

// 1. Create and export context directly
export const ResumeInfoContext = createContext({
  resumeInfo: null,
  setResumeInfo: () => {},
  resetResume: () => {},
});

// 2. Memoized initial state
const getInitialState = () => ({
  themeColor: "#3498db",
  firstName: "",
  lastName: "",
  jobTitle: "",
  email: "",
  phone: "",
  address: "",
  summary: "",
  education: [],
  experience: [],
  skills: [],
});

// 3. Named provider with stable exports
export const ResumeInfoProvider = ({ children }) => {
  const [resumeInfo, setResumeInfo] = useState(getInitialState);

  const resetResume = useCallback(() => {
    setResumeInfo(getInitialState());
    // Clear all resume data from localStorage
    [
      "education",
      "experience",
      "skills",
      "summary",
      "personal",
      "theme",
    ].forEach((key) => {
      localStorage.removeItem(`resume_${key}`);
    });
  }, []);

  const value = useMemo(
    () => ({
      resumeInfo,
      setResumeInfo: (update) => {
        setResumeInfo((prev) => ({
          ...prev,
          ...(typeof update === "function" ? update(prev) : update),
        }));
      },
      resetResume,
    }),
    [resumeInfo, resetResume]
  );

  return (
    <ResumeInfoContext.Provider value={value}>
      {children}
    </ResumeInfoContext.Provider>
  );
};

// 4. Named hook export
export const useResumeInfo = () => {
  const context = useContext(ResumeInfoContext);
  if (!context) {
    throw new Error("useResumeInfo must be used within a ResumeInfoProvider");
  }
  return context;
};
