import { useEffect, useState } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { auth, db } from "./firebase";
import { signInWithGoogle, logout } from "./Auth";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  setDoc,
} from "firebase/firestore";
import { setPersistence, browserLocalPersistence } from "firebase/auth";
import ListPage from "./ListPage";
import LoadingScreen from "./LoadingScreen";

function ListManager() {
  const [user, setUser] = useState(null);
  const [listName, setListName] = useState("");
  const [visitedLists, setVisitedLists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe;

    const initializeAuth = async () => {
      try {
        await setPersistence(auth, browserLocalPersistence);

        unsubscribe = auth.onAuthStateChanged(async (user) => {
          if (user) {
            const userRef = doc(db, "users", user.uid);
            await setDoc(
              userRef,
              {
                displayName: user.displayName,
                email: user.email,
                lastLogin: serverTimestamp(),
              },
              { merge: true }
            );
          }
          setUser(user);
          setIsLoading(false);
        });

        const savedLists =
          JSON.parse(localStorage.getItem("visitedLists")) || [];
        setVisitedLists(savedLists);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleListAccess = async (e) => {
    e.preventDefault();
    const displayName = listName.trim();
    const normalized = displayName.toLowerCase().replace(/\s+/g, "-");

    try {
      const listsRef = collection(db, "lists");
      const q = query(listsRef, where("name", "==", displayName));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        await addDoc(listsRef, {
          name: displayName,
          members: [user.uid],
          createdAt: serverTimestamp(),
        });
      }

      const newVisited = [
        ...new Map(
          [...visitedLists, { displayName, normalized }].map((item) => [
            item.normalized,
            item,
          ])
        ).values(),
      ];

      setVisitedLists(newVisited);
      localStorage.setItem("visitedLists", JSON.stringify(newVisited));

      navigate(`/list/${normalized}`);
    } catch (error) {
      console.error("Error accessing list:", error);
    }
  };

  const removeVisitedList = (normalized) => {
    const newVisited = visitedLists.filter(
      (list) => list.normalized !== normalized
    );
    setVisitedLists(newVisited);
    localStorage.setItem("visitedLists", JSON.stringify(newVisited));
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!user && isLoading == false) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-900 px-4">
        <div className="text-center p-8 rounded-xl bg-gray-800 max-w-md w-full">
          <h1 className="text-2xl text-white mb-6 font-bold">
            Grocery List App
          </h1>
          <button
            onClick={signInWithGoogle}
            className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl w-full flex items-center justify-center gap-2 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="w-5 h-5"
              viewBox="0 0 24 24"
            >
              <path
                fill="currentColor"
                d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.345-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-900 px-4">
      <div className="w-full max-w-md bg-gray-800 rounded-xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex flex-col max-w-56">
            <h1 className="text-xl font-bold text-white">
              Create or View Lists
            </h1>
            <div className="mt-4 text-center">
              <p className="text-gray-400 text-xs hover:text-gray-300 transition-colors mr-5">
                Lists are online & synchronized in real-time! Share the list
                name with your friends or your partner to collaborate together.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-3">
            <img
              src={user.photoURL}
              className="w-8 h-8 rounded-full object-cover"
              alt="User"
            />
            <button
              onClick={logout}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        <form onSubmit={handleListAccess} className="space-y-4">
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Enter list name"
            className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <button
            type="submit"
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go to the List
          </button>
        </form>

        {visitedLists.length > 0 && (
          <div className="mt-8">
            <h2 className="text-white mb-4 text-lg font-semibold">
              Your Lists
            </h2>
            <div className="space-y-2">
              {visitedLists.map((list) => (
                <div
                  key={list.normalized}
                  className="flex justify-between items-center bg-gray-700 p-3 rounded-lg"
                >
                  <button
                    onClick={() => navigate(`/list/${list.normalized}`)}
                    className="text-white hover:text-green-500 truncate text-left flex-1"
                  >
                    {list.displayName}
                  </button>
                  <button
                    onClick={() => removeVisitedList(list.normalized)}
                    className="text-red-500 hover:text-red-600 ml-2 p-1.5 rounded-full hover:bg-red-100/10 transition-all duration-200 transform hover:scale-110"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-6 w-6"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M4 7h16m-10-4h4a1 1 0 011 1v2H9V4a1 1 0 011-1z" />
                      <path
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                        d="M9 7h6"
                        strokeWidth="3"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/list/:listName" element={<ListPage />} />
      <Route path="/" element={<ListManager />} />
    </Routes>
  );
}

export default App;
