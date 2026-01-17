/** @type {import('tailwindcss').Config} */
module.exports = {
      // هنا بنحدد المسارات اللي فيها أكواد HTML أو JS
        content: [
                "./*.html",             // كل ملفات HTML في الفولدر الرئيسي
                    "./assets/**/*.{html,js}", // لو عندك فولدر اسمه src وفيه ملفات
                        "./js/**/*.js",         // لو عندك ملفات جافاسكريبت
        ],
          theme: {
                extend: {},
          },
            plugins: [],
        }
          }
        ]
} */