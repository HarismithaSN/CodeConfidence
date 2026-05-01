const APP_DATA = {
    user: {
        name: "Harismitha",
        college: "Dayananda Sagar College of Engineering",
        branch: "MCA",
        level: 3,
        xp: 450,
        nextLevelXp: 1000,
        streak: 12,
        badges: [
            { id: 1, icon: "🏆", name: "Logic King", earned: true, desc: "Solve 10 Advanced problems" },
            { id: 2, icon: "🔥", name: "Firespark", earned: true, desc: "Maintain a 7-day streak" },
            { id: 3, icon: "🎓", name: "Alumni Choice", earned: false, desc: "Get 5 peer approvals" }
        ],
        skills: {
            logic: 78,
            architecture: 64,
            optimization: 82,
            readability: 90
        },
        realTimeEnabled: true
    },
    roadmap: [
        { level: 1, name: "The Apprentice", icon: "🌱", status: "completed", topics: ["Syntax Basics", "Loops", "Conditions"] },
        { level: 2, name: "The Explorer", icon: "🧭", status: "completed", topics: ["Arrays", "Strings", "Sorting"] },
        { level: 3, name: "The Coder", icon: "⚔️", status: "current", topics: ["Recursion", "Trees", "Graphs"] },
        { level: 4, name: "The Engineer", icon: "🛠️", status: "locked", topics: ["System Design", "Scalability", "DP"] },
        { level: 5, name: "The Architect", icon: "🏛️", status: "locked", topics: ["Distributed Systems", "Microservices"] }
    ],
    challenges: [
        // LEVEL 1: BEGINNER (Basics)
        { id: 1, title: "Hello World", diff: "Easy", xp: 10, desc: "Print 'Hello, CodeConfidence' to the console.", lang: "Python" },
        { id: 2, title: "Sum of Two", diff: "Easy", xp: 15, desc: "Given two numbers, return their sum.", lang: "JavaScript" },
        { id: 3, title: "Even or Odd", diff: "Easy", xp: 15, desc: "Check if a number is even or odd.", lang: "Java" },
        { id: 4, title: "Factorial", diff: "Easy", xp: 25, desc: "Calculate factorial using a loop.", lang: "C++" },
        { id: 5, title: "Palindrome Check", diff: "Easy", xp: 30, desc: "Check if a string reads the same backwards.", lang: "Python" },

        // LEVEL 2: INTERMEDIATE (Arrays & Strings)
        { id: 6, title: "Two Sum", diff: "Medium", xp: 50, desc: "Find indices of two numbers that add up to target.", lang: "JavaScript" },
        { id: 7, title: "Valid Anagram", diff: "Medium", xp: 45, desc: "Determine if s and t are anagrams.", lang: "Python" },
        { id: 8, title: "Longest Substring", diff: "Medium", xp: 80, desc: "Find length of non-repeating substring.", lang: "Java" },
        { id: 9, title: "Array Spiral", diff: "Medium", xp: 70, desc: "Print a matrix in spiral order.", lang: "C++" },
        { id: 10, title: "Kth Largest", diff: "Medium", xp: 65, desc: "Find the kth largest element in an array.", lang: "Java" },

        // LEVEL 3: ADVANCED (Trees & Recursion)
        { id: 11, title: "Max Path Sum", diff: "Hard", xp: 120, desc: "Find max path sum in a binary tree.", lang: "Python" },
        { id: 12, title: "Merge K Lists", diff: "Hard", xp: 150, desc: "Merge K sorted linked lists efficiently.", lang: "C++" },
        { id: 13, title: "Binary Tree Level Order", diff: "Medium", xp: 60, desc: "Return level order traversal.", lang: "Java" },
        { id: 14, title: "Lowest Common Ancestor", diff: "Medium", xp: 85, desc: "Find LCA of two nodes in a BST.", lang: "Python" },
        { id: 15, title: "Reverse Linked List", diff: "Easy", xp: 35, desc: "Reverse a singly linked list.", lang: "JavaScript" },

        // LEVEL 4: EXPERT (DP & Graphs)
        { id: 16, title: "Knapsack 0/1", diff: "Hard", xp: 200, desc: "Classic dynamic programming problem.", lang: "C++" },
        { id: 17, title: "Climbing Stairs", diff: "Easy", xp: 20, desc: "Distinct ways to reach the top.", lang: "JavaScript" },
        { id: 18, title: "House Robber", diff: "Medium", xp: 90, desc: "Maximize loot from non-adjacent houses.", lang: "Python" },
        { id: 19, title: "Longest Path in DAG", diff: "Hard", xp: 180, desc: "Find the longest path in a directed acyclic graph.", lang: "Java" },
        { id: 20, title: "Word Ladder", diff: "Hard", xp: 220, desc: "Find shortest transformation sequence.", lang: "Python" },

        // LEVEL 5: PLACEMENT READY (Complex Systems)
        { id: 21, title: "LRU Cache", diff: "Hard", xp: 160, desc: "Design and implement Least Recently Used cache.", lang: "C++" },
        { id: 22, title: "Rate Limiter", diff: "Hard", xp: 200, desc: "Implement a token bucket rate limiter.", lang: "Java" },
        { id: 23, title: "Median from Stream", diff: "Hard", xp: 190, desc: "Find median from a continuous data stream.", lang: "JavaScript" },
        { id: 24, title: "Serialize Binary Tree", diff: "Hard", xp: 180, desc: "Serialize and deserialize a binary tree.", lang: "Python" },
        { id: 25, title: "Boyer-Moore Voting", diff: "Medium", xp: 75, desc: "Find majority element in O(1) space.", lang: "C++" },

        // RECENTLY ADDED (Bonus)
        { id: 26, title: "Valid Parentheses", diff: "Easy", xp: 20, desc: "Check if brackets match correctly.", lang: "JavaScript" },
        { id: 27, title: "Merge Intervals", diff: "Medium", xp: 90, desc: "Merge all overlapping intervals.", lang: "Python" },
        { id: 28, title: "Course Schedule", diff: "Hard", xp: 170, desc: "Find topological sort of courses.", lang: "Java" },
        { id: 29, title: "Implement Trie", diff: "Medium", xp: 110, desc: "Insert and search prefix in a tree.", lang: "C++" },
        { id: 30, title: "Daily Temperatures", diff: "Medium", xp: 80, desc: "Find next warmer day using a stack.", lang: "JavaScript" }
    ],
    career: {
        readiness: 72,
        tracks: [
            {
                name: "Capgemini", logo: "🏙️", match: 85, status: "open",
                requirements: ["Java", "SQL", "Logical Reasoning"],
                practice: [
                    { id: 'cg1', title: "String Compression", diff: "Medium", code: "public String compress(String s) {\n  // Capgemini: String manipulation\n  return \"\";\n}" },
                    { id: 'cg2', title: "Salary Join SQL", diff: "Easy", code: "-- Find Dept Name and Avg Salary\nSELECT d.name, AVG(e.sal) FROM Dept d..." },
                    { id: 'cg3', title: "Balanced Brackets", diff: "Medium", code: "public boolean isBalanced(String s) {\n  // Use a stack to check brackets\n  return false;\n}" },
                    { id: 'cg4', title: "Reverse Linked List", diff: "Medium", code: "public Node reverse(Node head) {\n  // In-place reversal\n  return null;\n}" },
                    { id: 'cg5', title: "Duplicate Chars", diff: "Easy", code: "public void findDuplicates(String s) {\n  // Print duplicate chars in string\n}" },
                    { id: 'cg6', title: "Nth Highest Salary", diff: "Hard", code: "-- SQL: Fetch Nth highest salary without LIMIT\nSELECT sal FROM Emp E1..." },
                    { id: 'cg7', title: "Mirror Tree", diff: "Hard", code: "public void mirror(Node root) {\n  // Convert binary tree to mirror image\n}" },
                    { id: 'cg8', title: "Target Sum", diff: "Medium", code: "public int[] twoSum(int[] arr, int target) {\n  // Find indices of two numbers adding to target\n  return new int[]{}; \n}" }
                ]
            },
            {
                name: "LTIMindtree", logo: "🌳", match: 68, status: "open",
                requirements: ["Python", "DSA", "Web"],
                practice: [
                    { id: 'lti1', title: "Array Equilibrium", diff: "Medium", code: "def findEquilibrium(arr):\n    # Find index where left sum == right sum\n    pass" },
                    { id: 'lti2', title: "Longest Unique Substr", diff: "Hard", code: "def longestSubstr(s):\n    # O(n) sliding window approach\n    return 0" },
                    { id: 'lti3', title: "Anagram Check", diff: "Easy", code: "def isAnagram(s1, s2):\n    # Efficient frequency check\n    return False" },
                    { id: 'lti4', title: "Merge Sorted Arrays", diff: "Medium", code: "def merge(arr1, arr2):\n    # Merge without using sort()\n    return []" },
                    { id: 'lti5', title: "Spiral Matrix", diff: "Hard", code: "def spiralOrder(matrix):\n    # Return items in spiral order\n    return []" },
                    { id: 'lti6', title: "Cycle Detection", diff: "Hard", code: "def hasCycle(head):\n    # Floyd's Cycle-Finding Algorithm\n    return False" },
                    { id: 'lti7', title: "Timer Decorator", diff: "Medium", code: "import time\ndef timer_decorator(func):\n    # Python: Wrap function to print execution time\n    pass" },
                    { id: 'lti8', title: "Valid Parentheses", diff: "Medium", code: "def isValid(s):\n    # Use stack to validate mapping\n    return True" }
                ]
            },
            {
                name: "Deloitte", logo: "💎", match: 42, status: "locked",
                requirements: ["C++", "Architecture", "Consulting"],
                practice: [
                    { id: 'del1', title: "Resource Allocation", diff: "Hard", code: "// Deloitte: Consulting Optimization\nint maxProfit(vector<int>& weights) {\n  return 0;\n}" },
                    { id: 'del2', title: "LRU Cache Design", diff: "Hard", code: "class LRUCache {\npublic:\n    // Implement get and put in O(1)\n};" },
                    { id: 'del3', title: "Singleton Pattern", diff: "Medium", code: "class Database {\n    // Thread-safe Singleton in C++\n};" },
                    { id: 'del4', title: "Rule of Three", diff: "Medium", code: "class MyArray {\n    // Implement Copy Constructor, Assignment, Destructor\n};" },
                    { id: 'del5', title: "Rate Limiter", diff: "Hard", code: "// Design a Token Bucket Rate Limiter\nbool allowRequest(int userId) { return true; }" },
                    { id: 'del6', title: "SQL Optimization", diff: "Medium", code: "-- Optimize this query using an Index Hint\nSELECT * FROM Orders WHERE id = 500;" },
                    { id: 'del7', title: "Wildcard Match", diff: "Hard", code: "bool isMatch(string s, string p) {\n    // DP approach for '?' and '*'\n    return true;\n}" },
                    { id: 'del8', title: "Custom Vector", diff: "Medium", code: "template <typename T>\nclass MyVector {\n    // Implement dynamic array sizing\n};" }
                ]
            },
            { name: "Accenture", logo: "⚡", match: 91, status: "open", requirements: ["Fullstack", "Cloud"] },
            {
                name: "TCS", logo: "🔵", match: 78, status: "open",
                requirements: ["Java", "SQL", "OOPs"],
                practice: [
                    { id: 'tcs1', title: "Difference between throw and throws", diff: "Easy", code: "// Java: Exception Handling\n// throw: used to throw exception explicitly\n// throws: declares exceptions that method might throw" },
                    { id: 'tcs2', title: "SQL Query: Names with substring", diff: "Easy", code: "-- Find student names containing 'nee'\nSELECT name FROM students WHERE name LIKE '%nee%';" },
                    { id: 'tcs3', title: "Java Features", diff: "Medium", code: "// Key features: Platform Independent, Object-Oriented, Secure, Robust, Multithreaded" },
                    { id: 'tcs4', title: "C# vs Java", diff: "Medium", code: "// C#: Proprietary by Microsoft, runs on .NET\n// Java: Open-source, runs on JVM" },
                    { id: 'tcs5', title: "Reverse Linked List", diff: "Medium", code: "public Node reverse(Node head) {\n  Node prev = null;\n  Node current = head;\n  while(current != null) {\n    Node next = current.next;\n    current.next = prev;\n    prev = current;\n    current = next;\n  }\n  return prev;\n}" },
                    { id: 'tcs6', title: "Array Equilibrium", diff: "Medium", code: "public int findEquilibrium(int[] arr) {\n  int total = 0, left = 0;\n  for(int num : arr) total += num;\n  for(int i=0; i<arr.length; i++) {\n    total -= arr[i];\n    if(left == total) return i;\n    left += arr[i];\n  }\n  return -1;\n}" },
                    { id: 'tcs7', title: "Valid Parentheses", diff: "Easy", code: "public boolean isValid(String s) {\n  Stack<Character> stack = new Stack<>();\n  for(char c : s.toCharArray()) {\n    if(c=='(') stack.push(')');\n    else if(c=='{') stack.push('}');\n    else if(c=='[') stack.push(']');\n    else if(stack.isEmpty() || stack.pop()!=c) return false;\n  }\n  return stack.isEmpty();\n}" },
                    { id: 'tcs8', title: "Fibonacci Series", diff: "Easy", code: "public void fibonacci(int n) {\n  int a=0, b=1;\n  System.out.print(a + \" \" + b);\n  for(int i=2; i<n; i++) {\n    int c = a+b;\n    System.out.print(\" \" + c);\n    a=b; b=c;\n  }\n}" }
                ]
            },
            {
                name: "Infosys", logo: "🔴", match: 85, status: "open",
                requirements: ["Python", "DSA", "Problem Solving"],
                practice: [
                    { id: 'inf1', title: "Time and Work: A and B", diff: "Medium", code: "// A takes 15 days, B takes 20 days\n// Work done in 4 days together: 4*(1/15 + 1/20) = 4*(7/60) = 28/60 = 7/15\n// Fraction left: 1 - 7/15 = 8/15" },
                    { id: 'inf2', title: "Profit and Loss", diff: "Easy", code: "// CP = 100, SP = 120, Profit = 20, % = 20%" },
                    { id: 'inf3', title: "Two Sum", diff: "Easy", code: "public int[] twoSum(int[] nums, int target) {\n  Map<Integer, Integer> map = new HashMap<>();\n  for(int i=0; i<nums.length; i++) {\n    int complement = target - nums[i];\n    if(map.containsKey(complement)) return new int[]{map.get(complement), i};\n    map.put(nums[i], i);\n  }\n  return new int[]{};\n}" },
                    { id: 'inf4', title: "Palindrome Check", diff: "Easy", code: "public boolean isPalindrome(String s) {\n  int left=0, right=s.length()-1;\n  while(left<right) {\n    if(s.charAt(left++) != s.charAt(right--)) return false;\n  }\n  return true;\n}" },
                    { id: 'inf5', title: "Merge Sorted Arrays", diff: "Medium", code: "public void merge(int[] nums1, int m, int[] nums2, int n) {\n  int i=m-1, j=n-1, k=m+n-1;\n  while(j>=0) {\n    if(i>=0 && nums1[i] > nums2[j]) nums1[k--] = nums1[i--];\n    else nums1[k--] = nums2[j--];\n  }\n}" },
                    { id: 'inf6', title: "Binary Search", diff: "Medium", code: "public int binarySearch(int[] arr, int target) {\n  int left=0, right=arr.length-1;\n  while(left<=right) {\n    int mid = left + (right-left)/2;\n    if(arr[mid]==target) return mid;\n    else if(arr[mid]<target) left=mid+1;\n    else right=mid-1;\n  }\n  return -1;\n}" },
                    { id: 'inf7', title: "Factorial using Recursion", diff: "Easy", code: "public int factorial(int n) {\n  if(n==0) return 1;\n  return n * factorial(n-1);\n}" },
                    { id: 'inf8', title: "Anagram Check", diff: "Easy", code: "public boolean isAnagram(String s, String t) {\n  if(s.length()!=t.length()) return false;\n  int[] count = new int[26];\n  for(char c : s.toCharArray()) count[c-'a']++;\n  for(char c : t.toCharArray()) count[c-'a']--;\n  for(int i : count) if(i!=0) return false;\n  return true;\n}" }
                ]
            },
            {
                name: "Wipro", logo: "🟡", match: 72, status: "open",
                requirements: ["C++", "SQL", "Logic"],
                practice: [
                    { id: 'wip1', title: "Clock Problems", diff: "Medium", code: "// Angle between hour and minute hands\n// Angle = |30*h - 5.5*m|" },
                    { id: 'wip2', title: "Permutation and Combination", diff: "Medium", code: "// Arrangements: n! / (n-r)!\n// Combinations: n! / (r! * (n-r)!)" },
                    { id: 'wip3', title: "Reverse Array", diff: "Easy", code: "void reverse(int arr[], int n) {\n  for(int i=0; i<n/2; i++) {\n    swap(arr[i], arr[n-1-i]);\n  }\n}" },
                    { id: 'wip4', title: "Linked List Cycle", diff: "Medium", code: "bool hasCycle(ListNode *head) {\n  ListNode *slow = head, *fast = head;\n  while(fast && fast->next) {\n    slow = slow->next;\n    fast = fast->next->next;\n    if(slow == fast) return true;\n  }\n  return false;\n}" },
                    { id: 'wip5', title: "SQL Joins", diff: "Easy", code: "-- Inner Join: SELECT * FROM A INNER JOIN B ON A.id = B.id;\n-- Left Join: SELECT * FROM A LEFT JOIN B ON A.id = B.id;" },
                    { id: 'wip6', title: "Max Subarray Sum", diff: "Medium", code: "int maxSubarraySum(int arr[], int n) {\n  int max_so_far = INT_MIN, max_ending_here = 0;\n  for(int i=0; i<n; i++) {\n    max_ending_here += arr[i];\n    if(max_so_far < max_ending_here) max_so_far = max_ending_here;\n    if(max_ending_here < 0) max_ending_here = 0;\n  }\n  return max_so_far;\n}" },
                    { id: 'wip7', title: "Prime Number Check", diff: "Easy", code: "bool isPrime(int n) {\n  if(n<=1) return false;\n  for(int i=2; i*i<=n; i++) {\n    if(n%i==0) return false;\n  }\n  return true;\n}" },
                    { id: 'wip8', title: "Tree Traversal", diff: "Medium", code: "void inorder(Node* root) {\n  if(root) {\n    inorder(root->left);\n    cout << root->data << \" \";\n    inorder(root->right);\n  }\n}" }
                ]
            },
            {
                name: "Amazon", logo: "📦", match: 95, status: "open",
                requirements: ["DSA", "System Design", "Leadership"],
                practice: [
                    { id: 'ama1', title: "K Largest Elements", diff: "Medium", code: "vector<int> kLargest(vector<int>& arr, int k) {\n  priority_queue<int, vector<int>, greater<int>> pq;\n  for(int num : arr) {\n    pq.push(num);\n    if(pq.size() > k) pq.pop();\n  }\n  vector<int> res;\n  while(!pq.empty()) { res.push_back(pq.top()); pq.pop(); }\n  return res;\n}" },
                    { id: 'ama2', title: "Binary Tree Traversal", diff: "Easy", code: "vector<int> inorderTraversal(TreeNode* root) {\n  vector<int> res;\n  stack<TreeNode*> st;\n  TreeNode* curr = root;\n  while(curr || !st.empty()) {\n    while(curr) { st.push(curr); curr = curr->left; }\n    curr = st.top(); st.pop();\n    res.push_back(curr->val);\n    curr = curr->right;\n  }\n  return res;\n}" },
                    { id: 'ama3', title: "Stock Buy Sell", diff: "Easy", code: "int maxProfit(vector<int>& prices) {\n  int min_price = INT_MAX, max_profit = 0;\n  for(int price : prices) {\n    min_price = min(min_price, price);\n    max_profit = max(max_profit, price - min_price);\n  }\n  return max_profit;\n}" },
                    { id: 'ama4', title: "Next Greater Element", diff: "Medium", code: "vector<int> nextGreaterElement(vector<int>& nums) {\n  vector<int> res(nums.size(), -1);\n  stack<int> st;\n  for(int i=nums.size()-1; i>=0; i--) {\n    while(!st.empty() && st.top() <= nums[i]) st.pop();\n    if(!st.empty()) res[i] = st.top();\n    st.push(nums[i]);\n  }\n  return res;\n}" },
                    { id: 'ama5', title: "Rotate Matrix 90 Degrees", diff: "Medium", code: "void rotate(vector<vector<int>>& matrix) {\n  int n = matrix.size();\n  for(int i=0; i<n; i++) {\n    for(int j=i; j<n; j++) {\n      swap(matrix[i][j], matrix[j][i]);\n    }\n  }\n  for(int i=0; i<n; i++) {\n    reverse(matrix[i].begin(), matrix[i].end());\n  }\n}" },
                    { id: 'ama6', title: "Trapping Rain Water", diff: "Hard", code: "int trap(vector<int>& height) {\n  int n = height.size(), res = 0;\n  vector<int> left(n), right(n);\n  left[0] = height[0];\n  for(int i=1; i<n; i++) left[i] = max(left[i-1], height[i]);\n  right[n-1] = height[n-1];\n  for(int i=n-2; i>=0; i--) right[i] = max(right[i+1], height[i]);\n  for(int i=0; i<n; i++) res += min(left[i], right[i]) - height[i];\n  return res;\n}" },
                    { id: 'ama7', title: "Lowest Common Ancestor", diff: "Medium", code: "TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {\n  if(!root || root==p || root==q) return root;\n  TreeNode* left = lowestCommonAncestor(root->left, p, q);\n  TreeNode* right = lowestCommonAncestor(root->right, p, q);\n  if(left && right) return root;\n  return left ? left : right;\n}" },
                    { id: 'ama8', title: "Edit Distance", diff: "Hard", code: "int minDistance(string word1, string word2) {\n  int m = word1.size(), n = word2.size();\n  vector<vector<int>> dp(m+1, vector<int>(n+1));\n  for(int i=0; i<=m; i++) dp[i][0] = i;\n  for(int j=0; j<=n; j++) dp[0][j] = j;\n  for(int i=1; i<=m; i++) {\n    for(int j=1; j<=n; j++) {\n      if(word1[i-1] == word2[j-1]) dp[i][j] = dp[i-1][j-1];\n      else dp[i][j] = 1 + min({dp[i-1][j], dp[i][j-1], dp[i-1][j-1]});\n    }\n  }\n  return dp[m][n];\n}" }
                ]
            }
        ],
        interviews: [
            { company: "Capgemini", role: "Analyst", difficulty: "Medium", rounds: 3, story: "The technical round focused heavily on OOPs and SQL queries. Be sure to know your joins!" },
            { company: "Deloitte", role: "SDE-1", difficulty: "Hard", rounds: 4, story: "Algorithmic thinking is key. They asked a variation of the knapsack problem." },
            { company: "TCS", role: "System Engineer", difficulty: "Medium", rounds: 3, story: "TCS interviews include aptitude tests, technical questions on Java/C#, and SQL queries. They often ask about exception handling and database operations." },
            { company: "Infosys", role: "Software Engineer", difficulty: "Medium", rounds: 4, story: "Infosys focuses on logical reasoning, aptitude problems like time & work, and coding questions. They test problem-solving skills with arrays and strings." },
            { company: "Wipro", role: "Project Engineer", difficulty: "Easy", rounds: 3, story: "Wipro interviews cover basic programming, SQL joins, and logical puzzles. They emphasize data structures like linked lists and trees." },
            { company: "Amazon", role: "SDE-2", difficulty: "Hard", rounds: 5, story: "Amazon's interview process is rigorous with focus on DSA, system design, and leadership principles. Expect questions on trees, graphs, and optimization problems." },
            { company: "LTIMindtree", role: "Developer", difficulty: "Medium", rounds: 3, story: "LTIMindtree asks Python-based problems, recursion, and web technologies. They value clean code and efficient solutions." },
            { company: "Accenture", role: "Associate Software Engineer", difficulty: "Medium", rounds: 4, story: "Accenture interviews include fullstack questions, cloud concepts, and behavioral rounds. They look for well-rounded candidates." }
        ]
    }
};
