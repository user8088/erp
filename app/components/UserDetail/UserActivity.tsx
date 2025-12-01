"use client";

export default function UserActivity() {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Activity</h3>
      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          <p>Administrator created this · 17 hours ago</p>
        </div>
      </div>
    </div>
  );
}

