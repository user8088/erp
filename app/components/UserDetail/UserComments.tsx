"use client";

import { useState } from "react";

export default function UserComments() {
  const [comment, setComment] = useState("");

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Comments</h3>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-medium">AM</span>
        </div>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Type a reply / comment"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
      </div>
    </div>
  );
}

