import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import MinusCartIcon from "./Icons/cart-minus.png";
import { auth, db } from "./firebase";
import PropTypes from "prop-types";
import { GoogleGenerativeAI } from "@google/generative-ai";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { updateDoc } from "firebase/firestore";
import {
  collection,
  addDoc,
  query,
  onSnapshot,
  deleteDoc,
  doc,
  orderBy,
  serverTimestamp,
  arrayUnion,
  getDocs,
  where,
  writeBatch,
} from "firebase/firestore";
import LoadingScreen from "./TinyLoadingScreen";

function ListPage() {
  const { listName } = useParams();
  const navigate = useNavigate();
  const [imageSearch, setImageSearch] = useState("");
  const [groceryItems, setGroceryItems] = useState([]);
  const [user, setUser] = useState(null);
  const [memberNames, setMemberNames] = useState([]);
  const [listId, setListId] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const genAI = new GoogleGenerativeAI(
    "AIzaSyAThR2xsb5E_ra5OfeWhqsBy3wiJZch-so"
  );
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const [prompt, setPrompt] = useState(
    `I am using your prompt answer for my grocery list app where the user is able to click on a button called "search for a recipe" based on the grocery list items they have in their cart. You will reply to the user and bare in mind they are not able to reply to you, so do not ask the user any question since they cannot reply. You are not limited for recipes with only the grocery list items, you can obviously include basic items that most households have - for example milk, sugar, salt, water, etc... Based on what I just told you, give me recipe ideas that I could make with these items / ingredients: ${[
      "",
    ]}

Please format your response using Markdown:
- Use headings for recipe titles (e.g., # Recipe Title)
- Use bullet points for ingredient lists (e.g., - Ingredient)
- Use paragraphs for descriptions.
`
  );
  const [promptResult, setPromptResult] = useState("");

  console.log(promptResult.length);

  const onPromptSubmit = async () => {
    try {
      setIsLoading(true);
      const result = await model.generateContent(prompt);
      setPromptResult(result.response.text());

      setIsLoading(false);
    } catch (err) {
      console.log(err);
      setPromptResult(""); // In case of an error, reset to an empty string.  Important for ReactMarkdown.
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) navigate("/");
      setUser(user);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!user || !listName) return;

    const decodedListName = listName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "");

    const listsRef = collection(db, "lists");
    const listQuery = query(listsRef, where("name", "==", decodedListName));

    const unsubscribeList = onSnapshot(listQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const listDoc = snapshot.docs[0];
        const listData = listDoc.data();

        if (!listData.members.includes(user.uid)) {
          await updateDoc(doc(db, "lists", listDoc.id), {
            members: arrayUnion(user.uid),
          });
        }

        setListId(listDoc.id);

        const usersRef = collection(db, "users");
        const userQuery = query(usersRef, where("uid", "in", listData.members));
        const userSnapshot = await getDocs(userQuery);
        const names = userSnapshot.docs.map((doc) => doc.data().displayName);
        setMemberNames(names);
      } else {
        navigate("/");
      }
    });

    return () => unsubscribeList();
  }, [listName, user, navigate]);

  useEffect(() => {
    if (!user || !listId) return;

    const itemsRef = collection(db, "lists", listId, "items");
    const q = query(itemsRef, orderBy("createdAt", "desc"));

    const unsubscribeItems = onSnapshot(q, (snapshot) => {
      const newItems = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setGroceryItems(newItems); // aoifj

      const itemNames = newItems.map((item) => item.itemName);
      setIngredients(itemNames);

      const newPrompt = `I am using your prompt answer for my grocery list app where the user is able to click on a button called "search for a recipe" based on the grocery list items they have in their cart. You will reply to the user and bare in mind they are not able to reply to you, so do not ask the user any question since they cannot reply. Do not speak to me, speak directly to ${
        user.displayName
      } (it's my name). Also, make sure to include some titles to your response. You are not limited for recipes with only the grocery list items, you can obviously include basic items that most households have - for example milk, sugar, salt, water, etc... Based on what I just told you, give me recipe ideas that I could make with these items / ingredients: ${itemNames.join(
        ", "
      )}

Please format your response using Markdown:
- Use headings for recipe titles (e.g., # Recipe Title)
- Use bullet points for ingredient lists (e.g., - Ingredient), but do not use bullet points for the list titles, instead add ## (e.g., ## Ingredients)
- Use paragraphs for descriptions.`;
      setPrompt(newPrompt);
    });

    return () => unsubscribeItems();
  }, [listId, user]);

  const onHandleSearch = async (e) => {
    e.preventDefault();
    if (!imageSearch.trim() || !listId) return;

    try {
      const { data } = await axios.post(
        "https://google.serper.dev/images",
        {
          q: `supermarket packaging clear photo of ${imageSearch} on a plain background`,
          num: 1,
        },
        {
          headers: {
            "X-API-KEY": "1f75c2b111ad0bd95a563938e5cb0d1cdb8add15",
            "Content-Type": "application/json",
          },
        }
      );

      if (data.images?.length) {
        await addDoc(collection(db, "lists", listId, "items"), {
          itemName:
            imageSearch[0].toUpperCase() + imageSearch.slice(1).toLowerCase(),
          imageUrl: data.images[0].imageUrl,
          createdAt: serverTimestamp(),
          addedBy: user.uid,
        });
      }

      setImageSearch("");
    } catch (error) {
      console.error("Error:", error.message);
    }
  };

  const onHandleRemoveItem = async (itemId) => {
    if (!listId) return;
    try {
      await deleteDoc(doc(db, "lists", listId, "items", itemId));
    } catch (error) {
      console.error("Delete error:", error.message);
    }
  };

  const handleClearList = async () => {
    if (!listId) return;

    try {
      const itemsRef = collection(db, "lists", listId, "items");
      const snapshot = await getDocs(itemsRef);
      const batch = writeBatch(db);

      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });

      await batch.commit();
    } catch (error) {
      console.error("Clear list error:", error.message);
    }
  };

  const GroceryCard = ({ item }) => (
    <div>
      <div className="flex justify-between items-center w-full mb-3">
        <span className="ml-2 md:ml-6 font-semibold text-white text-sm md:text-base truncate">
          {item.itemName}
        </span>
        <div className="flex items-center gap-2">
          <img
            className="w-16 h-16 md:w-20 md:h-20 object-cover rounded-xl"
            src={item.imageUrl}
            alt={item.itemName}
            onError={(e) => (e.target.src = "https://via.placeholder.com/150")}
          />
          <img
            className="w-6 h-6 md:w-8 md:h-8 cursor-pointer"
            src={MinusCartIcon}
            alt="Remove"
            onClick={() => onHandleRemoveItem(item.id)}
          />
        </div>
      </div>
    </div>
  );

  GroceryCard.propTypes = {
    item: PropTypes.shape({
      id: PropTypes.string.isRequired,
      itemName: PropTypes.string.isRequired,
      imageUrl: PropTypes.string.isRequired,
    }).isRequired,
  };

  return (
    <div className="flex justify-center min-h-screen bg-gray-900 px-4">
      <div className="w-full md:w-10/12 lg:w-8/12 xl:w-6/12 max-w-2xl py-6">
        <div className="w-full mb-4 md:mb-6 grid grid-cols-[1fr_auto] items-center gap-2">
          <div className="min-w-0">
            <div className="text-white text-sm md:text-base truncate">
              <span className="truncate">{listName.replace(/-/g, " ")}</span>{" "}
              list.
            </div>
            {memberNames.length > 0 && (
              <div className="text-gray-400 text-xs mt-1">
                Members: {memberNames.join(", ")}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleClearList}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-3 md:py-2 md:px-4 rounded-xl text-xs md:text-sm whitespace-nowrap"
            >
              Clear List
            </button>
            <button
              onClick={() => navigate("/")}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-3 md:py-2 md:px-4 rounded-xl text-xs md:text-sm whitespace-nowrap"
            >
              Go Back
            </button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2 mb-6 md:mb-10 w-full">
          <form className="flex flex-1 gap-2" onSubmit={onHandleSearch}>
            <input
              placeholder="Add groceries..."
              onChange={(e) => setImageSearch(e.target.value)}
              value={imageSearch}
              className="text-black bg-white rounded-full outline-none pl-4 md:pl-6 pr-2 py-3 flex-1 text-sm md:text-base"
              autoFocus
            />
            <button
              type="submit"
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl text-sm md:text-base whitespace-nowrap"
            >
              Add
            </button>
          </form>
        </div>

        <div className="w-full">
          {groceryItems.length > 0 ? (
            groceryItems.map((item) => (
              <GroceryCard item={item} key={item.id} />
            ))
          ) : (
            <p className="text-white text-center text-sm md:text-base">
              {listName.replace(/-/g, " ")} is empty
            </p>
          )}
        </div>
        <div className="text-center mt-10">
          {groceryItems.length > 0 && isLoading == false && (
            <div>
              <button
                onClick={onPromptSubmit}
                className="underline text-xs text-green-500"
              >
                Ask AI for recipes
              </button>
              {promptResult.length != 0 && (
                <button
                  onClick={() => setPromptResult("")}
                  className="underline text-xs text-red-400 ml-4"
                >
                  Clear text
                </button>
              )}
            </div>
          )}

          <div className="text-xs">
            {isLoading ? (
              <LoadingScreen />
            ) : (
              promptResult && (
                <div className="ai-response-container">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {promptResult}
                  </ReactMarkdown>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ListPage;
