import React, { useState, useEffect } from 'react';
import { db, auth, googleProvider } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import './index.css';

function App() {
  const [user, setUser] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ongoing');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState({
    title: '',
    priority: 'medium',
    category: 'personal' // default
  });
  const [editingTaskId, setEditingTaskId] = useState(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setTasks([]);
        setLoading(false);
      }
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    const q = query(
      collection(db, 'tasks'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTasks(taskList);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const openEditModal = (task) => {
    setNewTask({
      title: task.title,
      priority: task.priority || 'medium',
      category: task.category || 'personal'
    });
    setEditingTaskId(task.id);
    setShowModal(true);
  };

  const saveTask = async () => {
    // 1. 제목 결정 (모달이 열려있으면 newTask.title, 아니면 하단 입력창 inputValue)
    const title = showModal ? newTask.title : inputValue;
    if (!title?.trim()) return;
    
    try {
      if (editingTaskId) {
        // 수정 모드
        const taskRef = doc(db, 'tasks', editingTaskId);
        await updateDoc(taskRef, {
          title: title.trim(),
          priority: newTask.priority,
          category: newTask.category,
          updatedAt: serverTimestamp()
        });
      } else {
        // 생성 모드
        const taskData = {
          title: title.trim(),
          completed: false,
          priority: showModal ? newTask.priority : 'medium',
          category: showModal ? newTask.category : 'personal',
          due: showModal ? '오늘 오후 5:00' : null,
          createdAt: serverTimestamp(),
          userId: user.uid
        };
        await addDoc(collection(db, 'tasks'), taskData);
      }
      
      // 3. 상태 초기화
      if (showModal) {
        setNewTask({ title: '', priority: 'medium', category: 'personal' });
        setEditingTaskId(null);
        setShowModal(false);
      } else {
        setInputValue('');
      }
    } catch (e) {
      console.error("Error saving task: ", e);
      alert("할 일 저장 중 오류가 발생했습니다.");
    }
  };

  const toggleTask = async (id, currentStatus) => {
    try {
      const taskRef = doc(db, 'tasks', id);
      await updateDoc(taskRef, {
        completed: !currentStatus
      });
    } catch (e) {
      console.error("Error updating task: ", e);
    }
  };

  const deleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, 'tasks', id));
    } catch (e) {
      console.error("Error deleting task: ", e);
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    if (activeTab === 'ongoing') return !task.completed && matchesSearch;
    if (activeTab === 'completed') return task.completed && matchesSearch;
    return matchesSearch;
  });

  if (!user) {
    return (
      <div className="container" style={{ justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: '2rem' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ width: '5rem', height: '5rem', backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>task_alt</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '0.5rem' }}>To-Do Today</h1>
          <p style={{ color: 'var(--slate-500)', marginBottom: '2rem' }}>오늘의 할일을 스마트하게 관리하세요</p>
          <button className="button-primary" onClick={handleLogin} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem 2rem' }}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" style={{ width: '1.25rem' }} />
            구글로 시작하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <header style={{ padding: '1.5rem 1.5rem 0.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <div>
            <p style={{ color: 'var(--primary)', fontWeight: '600', fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {new Date().toLocaleDateString('ko-KR', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 style={{ fontSize: '1.875rem', fontWeight: '700', letterSpacing: '-0.025em' }}>
              {activeTab === 'completed' ? '완료된 할일' : '오늘의 할일'}
            </h1>
          </div>
          <div onClick={handleLogout} style={{ position: 'relative', cursor: 'pointer' }}>
            <img src={user.photoURL} alt="User" style={{ width: '3rem', height: '3rem', borderRadius: '50%', border: '2px solid rgba(var(--primary-rgb), 0.2)' }} />
            <div style={{ position: 'absolute', bottom: 0, right: 0, width: '1rem', height: '1rem', backgroundColor: '#22c55e', borderRadius: '50%', border: '2px solid white' }}></div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ padding: '0 1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(var(--primary-rgb), 0.1)' }}>
          <button 
            onClick={() => setActiveTab('ongoing')}
            style={{ 
              flex: 1, padding: '0.75rem 0', fontSize: '0.875rem', fontWeight: '700', border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: activeTab === 'ongoing' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'ongoing' ? 'var(--primary)' : 'var(--slate-400)'
            }}
          >
            진행 중
          </button>
          <button 
            onClick={() => setActiveTab('completed')}
            style={{ 
              flex: 1, padding: '0.75rem 0', fontSize: '0.875rem', fontWeight: '700', border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: activeTab === 'completed' ? '2px solid var(--primary)' : '2px solid transparent',
              color: activeTab === 'completed' ? 'var(--primary)' : 'var(--slate-400)'
            }}
          >
            완료됨
          </button>
        </div>
      </div>

      {/* Search Bar */}
      {activeTab === 'completed' && (
        <div style={{ padding: '0 1.5rem 1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(var(--primary-rgb), 0.05)', padding: '0.75rem 1rem', borderRadius: '0.75rem' }}>
            <span className="material-symbols-outlined" style={{ color: 'var(--slate-400)' }}>search</span>
            <input 
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: '0.875rem', color: 'var(--text-current)' }}
              placeholder="완료된 할일 검색..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Task List */}
      <main style={{ flex: 1, padding: '0 1rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '2rem' }}>
        {loading ? (
          <div style={{ padding: '4rem 0', textAlign: 'center', opacity: 0.5 }}>로딩 중...</div>
        ) : filteredTasks.length === 0 ? (
          <div style={{ padding: '4rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.2 }}>
            <div style={{ width: '8rem', height: '8rem', borderRadius: '1.5rem', border: '2px dashed var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '3rem' }}>{activeTab === 'completed' ? 'history' : 'add_task'}</span>
            </div>
            <p style={{ fontWeight: '600', color: 'var(--primary)' }}>할일이 없습니다</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={task.id} className="card animate-slide-up" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div 
                  onClick={() => toggleTask(task.id, task.completed)}
                  style={{ 
                    width: '1.75rem', height: '1.75rem', borderRadius: '50%', 
                    border: task.completed ? 'none' : '2px solid rgba(var(--primary-rgb), 0.3)',
                    backgroundColor: task.completed ? 'var(--primary)' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    color: 'white'
                  }}
                >
                  {task.completed && <span className="material-symbols-outlined" style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>check</span>}
                </div>
                <div>
                  <p style={{ 
                    fontWeight: '600', 
                    color: task.completed ? 'var(--slate-400)' : 'var(--text-current)',
                    textDecoration: task.completed ? 'line-through' : 'none',
                    fontSize: '1rem'
                  }}>
                    {task.title}
                  </p>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem', alignItems: 'center' }}>
                    {task.due && (
                      <p style={{ fontSize: '0.75rem', color: 'var(--slate-500)', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>schedule</span>
                        {task.due}
                      </p>
                    )}
                    {task.priority === 'high' && (
                      <p style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.1rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '0.875rem' }}>priority_high</span>
                        긴급
                      </p>
                    )}
                    <span style={{ 
                      fontSize: '0.625rem', padding: '0.1rem 0.5rem', borderRadius: '1rem', 
                      backgroundColor: task.category === 'work' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(139, 92, 246, 0.1)',
                      color: task.category === 'work' ? '#3b82f6' : '#8b5cf6',
                      fontWeight: '700'
                    }}>
                      {task.category === 'work' ? '업무' : task.category === 'personal' ? '개인' : task.category === 'health' ? '건강' : '쇼핑'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.25rem', color: 'var(--slate-300)' }}>
                <button onClick={() => openEditModal(task)} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>edit</span>
                </button>
                <button onClick={() => deleteTask(task.id)} style={{ padding: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </main>

      {/* Input & Action Area Area */}
      <div style={{ padding: '1rem 1.5rem', backgroundColor: 'var(--bg-current)', borderTop: '1px solid rgba(var(--primary-rgb), 0.1)', position: 'sticky', bottom: 0, zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {/* 플러스 버튼을 입력창 옆으로 이동 */}
          {activeTab === 'ongoing' && (
            <button 
              onClick={() => {
                setEditingTaskId(null);
                setNewTask({ title: '', priority: 'medium', category: 'personal' });
                setShowModal(true);
              }}
              style={{ 
                width: '3.5rem', height: '3.5rem', borderRadius: '1.25rem',
                backgroundColor: 'var(--primary)', color: 'white', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-primary)',
                flexShrink: 0
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '2rem' }}>add</span>
            </button>
          )}
          
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.75rem', backgroundColor: 'var(--card-bg)', padding: '0.5rem', borderRadius: '1.25rem', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-current)' }}>
            <button style={{ padding: '0.5rem', color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer' }}>
              <span className="material-symbols-outlined">mic</span>
            </button>
            <input 
              style={{ flex: 1, background: 'none', border: 'none', padding: '0.75rem 0', outline: 'none', color: 'var(--text-current)', fontSize: '0.95rem' }}
              placeholder="빠르게 할일 추가..." 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && saveTask()}
            />
            <button 
              onClick={saveTask}
              style={{ 
                backgroundColor: 'rgba(var(--primary-rgb), 0.1)', color: 'var(--primary)', width: '2.5rem', height: '2.5rem', borderRadius: '0.75rem', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined">arrow_upward</span>
            </button>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content animate-slide-up" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--slate-500)', cursor: 'pointer', padding: '0.5rem' }}>
                <span className="material-symbols-outlined">close</span>
              </button>
              <h2 style={{ fontSize: '1.25rem', fontWeight: '800' }}>{editingTaskId ? '할 일 수정' : '새로운 할 일'}</h2>
              <button onClick={saveTask} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontWeight: '800', cursor: 'pointer' }}>{editingTaskId ? '수정' : '저장'}</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--slate-400)', textTransform: 'uppercase' }}>할일 내용</label>
              <textarea 
                className="textarea-field"
                placeholder="어떤 일을 완료해야 하나요?"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
                autoFocus
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--slate-400)', textTransform: 'uppercase' }}>우선순위</label>
              <div className="priority-group">
                {['low', 'medium', 'high'].map(p => (
                  <button 
                    key={p}
                    className={`selectable priority-${p} ${newTask.priority === p ? 'selected' : ''}`}
                    onClick={() => setNewTask({...newTask, priority: p})}
                  >
                    <span className="priority-dot"></span>
                    {p === 'low' ? '낮음' : p === 'medium' ? '중간' : '높음'}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: '800', color: 'var(--slate-400)', textTransform: 'uppercase' }}>카테고리</label>
              <div className="category-grid">
                {[
                  { id: 'work', icon: 'work', label: '업무' },
                  { id: 'personal', icon: 'home', label: '개인' },
                  { id: 'health', icon: 'fitness_center', label: '건강' },
                  { id: 'shopping', icon: 'shopping_cart', label: '쇼핑' }
                ].map(cat => (
                  <button 
                    key={cat.id}
                    className={`selectable ${newTask.category === cat.id ? 'selected' : ''}`}
                    onClick={() => setNewTask({...newTask, category: cat.id})}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '1.25rem' }}>{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="button-primary" style={{ marginTop: '1rem', padding: '1.25rem' }} onClick={saveTask}>
              {editingTaskId ? '수정 완료하기' : '할 일 생성하기'}
            </button>
          </div>
        </div>
      )}

      {/* Nav - 달력 제거 */}
      <nav style={{ 
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', 
        borderTop: '1px solid var(--border-current)', 
        backgroundColor: 'var(--card-bg)', 
        padding: '0.75rem 1rem 0.5rem',
        paddingBottom: 'env(safe-area-inset-bottom, 0.5rem)' 
      }}>
        <div onClick={() => setActiveTab('ongoing')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'ongoing' ? 'var(--primary)' : 'var(--slate-400)', cursor: 'pointer', padding: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'ongoing' ? "'FILL' 1" : "'FILL' 0" }}>format_list_bulleted</span>
          <span style={{ fontSize: '0.625rem', fontWeight: '800', marginTop: '0.25rem' }}>할일</span>
        </div>
        <div onClick={() => setActiveTab('completed')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: activeTab === 'completed' ? 'var(--primary)' : 'var(--slate-400)', cursor: 'pointer', padding: '0.5rem' }}>
          <span className="material-symbols-outlined" style={{ fontVariationSettings: activeTab === 'completed' ? "'FILL' 1" : "'FILL' 0" }}>check_circle</span>
          <span style={{ fontSize: '0.625rem', fontWeight: '800', marginTop: '0.25rem' }}>완료</span>
        </div>
        <div onClick={handleLogout} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: 'var(--slate-400)', cursor: 'pointer', padding: '0.5rem' }}>
          <span className="material-symbols-outlined">logout</span>
          <span style={{ fontSize: '0.625rem', fontWeight: '800', marginTop: '0.25rem' }}>로그아웃</span>
        </div>
      </nav>
    </div>
  );
}

export default App;
