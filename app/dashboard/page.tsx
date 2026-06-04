              {/* Scrollable Chat Area */}
              <div className="flex-1 p-6 overflow-y-auto bg-gray-50 space-y-5 scrollbar-thin scrollbar-thumb-gray-300" style={{ maxHeight: '620px' }}>
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.type === 'system' ? 'justify-center' : 'gap-3'}`}>
                    
                    {/* Icon - only for bot messages */}
                    {msg.type !== 'system' && (
                      <div className="w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center text-sm font-bold border-2 border-white mt-1"
                        style={{
                          backgroundColor: msg.type === 'ledger' ? '#3b82f6' : 
                                         msg.type === 'spark' ? '#f97316' : 
                                         msg.type === 'shade' ? '#8b5cf6' : '#ef4444'
                        }}>
                        {msg.type === 'ledger' ? 'L' : msg.type === 'spark' ? 'S' : msg.type === 'shade' ? 'H' : 'C'}
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className={`p-4 rounded-2xl flex-1 max-w-[85%] ${msg.type === 'system' ? 'bg-gray-100 text-center mx-auto' : 'bg-white shadow-sm'}`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>