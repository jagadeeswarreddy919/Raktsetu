import React, { useState, useEffect } from 'react';
import { BookOpen, User, Calendar, Tag } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../utils/api';

const BlogHub = () => {
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    const fetchBlogs = async () => {
      try {
        const res = await axios.get(`${API_URL}/api/blogs`);
        setBlogs(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBlogs();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="space-y-2 text-center max-w-2xl mx-auto">
        <h1 className="text-4xl font-black">RaktSetu Articles & News</h1>
        <p className="text-sm text-slate-500">Read educational insights, community metrics, and survival tips from our medical and administrative boards.</p>
      </div>

      {blogs.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogs.map((b) => (
            <div key={b._id} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg overflow-hidden flex flex-col justify-between">
              {b.coverImage && (
                <img src={b.coverImage} alt={b.title} className="w-full h-48 object-cover" />
              )}
              <div className="p-6 space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {b.tags?.map((t, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-[9px] font-black uppercase bg-slate-100 dark:bg-dark-800 text-slate-500 rounded">
                        {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white leading-snug">{b.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-4 leading-relaxed">{b.content}</p>
                </div>

                <div className="flex justify-between items-center pt-4 border-t text-[10px] text-slate-400 font-semibold mt-4">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-primary-500" /> {b.author?.fullName}</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-indigo-500" /> {new Date(b.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 text-slate-400 space-y-2">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 animate-pulse" />
          <p className="text-sm font-semibold">No educational blogs published yet.</p>
        </div>
      )}
    </div>
  );
};

export default BlogHub;
