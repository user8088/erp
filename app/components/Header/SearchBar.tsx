"use client";

import { Search } from "lucide-react";
import { useState } from "react";

export default function SearchBar() {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="flex-1 max-w-2xl mx-auto">
      <div
        className={`relative flex items-center bg-white border border-gray-300 rounded-md transition-all ${
          isFocused ? "border-orange-500 shadow-sm" : ""
        }`}
      >
        <Search className="w-4 h-4 text-gray-400 ml-3" />
        <input
          type="text"
          placeholder="Search or type a command (Ctrl + G)"
          className="flex-1 px-3 py-2 text-sm outline-none placeholder:text-gray-400"
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </div>
    </div>
  );
}

