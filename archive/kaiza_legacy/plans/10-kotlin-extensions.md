---
status: APPROVED
title: "Kotlin Full-Stack Chat Application"
description: "Real-time messaging platform with Ktor backend and Android frontend using Kotlin"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/kotlin/**"
---

# Kotlin Full-Stack Implementation Plan

## Overview
Build a complete real-time chat application in Kotlin with extension functions, coroutines, sealed classes, and a sophisticated Android frontend with Compose UI.

## Extension Functions

### 1. String Extensions
```kotlin
fun String.isValidEmail(): Boolean {
    return this.matches(Regex("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}"))
}

fun String.truncate(length: Int = 50): String {
    return if (this.length > length) "${this.take(length)}..." else this
}

fun String.toMessagePreview(): String {
    return this.replace("\n", " ").truncate(100)
}
```

### 2. Collection Extensions
```kotlin
inline fun <T> List<T>.firstOrElse(default: T, predicate: (T) -> Boolean): T {
    return this.firstOrNull(predicate) ?: default
}

fun <T> List<T>.chunked(size: Int): List<List<T>> {
    return this.fold(emptyList()) { acc, item ->
        if (acc.isEmpty() || acc.last().size == size) {
            acc + listOf(listOf(item))
        } else {
            acc.dropLast(1) + listOf(acc.last() + item)
        }
    }
}

fun List<Message>.groupByDate(): Map<LocalDate, List<Message>> {
    return this.groupBy { it.timestamp.toLocalDate() }
}
```

### 3. Coroutine Extensions
```kotlin
suspend inline fun <T> retryWithExponentialBackoff(
    maxRetries: Int = 3,
    initialDelay: Long = 100,
    block: suspend () -> T
): T {
    var delay = initialDelay
    var exception: Exception? = null
    
    repeat(maxRetries) {
        try {
            return block()
        } catch (e: Exception) {
            exception = e
            delay(delay)
            delay *= 2
        }
    }
    
    throw exception!!
}
```

## Sealed Classes & Pattern Matching

### 1. Domain Models
```kotlin
sealed class User {
    abstract val id: String
    abstract val name: String
    
    data class Regular(override val id: String, override val name: String, val email: String) : User()
    data class Bot(override val id: String, override val name: String) : User()
    data class Admin(override val id: String, override val name: String, val permissions: Set<String>) : User()
}

sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val exception: Exception) : Result<Nothing>()
    object Loading : Result<Nothing>()
}

sealed class ChatEvent {
    data class MessageReceived(val message: Message) : ChatEvent()
    data class UserTyping(val userId: String, val isTyping: Boolean) : ChatEvent()
    data class UserJoined(val user: User) : ChatEvent()
    data class UserLeft(val userId: String) : ChatEvent()
}
```

### 2. Pattern Matching with When
```kotlin
fun handleChatEvent(event: ChatEvent) {
    when (event) {
        is ChatEvent.MessageReceived -> {
            messageViewModel.addMessage(event.message)
        }
        is ChatEvent.UserTyping -> {
            typingIndicatorViewModel.setUser(event.userId, event.isTyping)
        }
        is ChatEvent.UserJoined -> {
            notificationViewModel.showJoinedNotification(event.user.name)
        }
        is ChatEvent.UserLeft -> {
            notificationViewModel.showLeftNotification(event.userId)
        }
    }
}

fun getUserInfo(user: User): String = when (user) {
    is User.Regular -> "User: ${user.name} (${user.email})"
    is User.Bot -> "Bot: ${user.name}"
    is User.Admin -> "Admin: ${user.name} with ${user.permissions.size} permissions"
}
```

## Scope Functions

### 1. Let, Apply, Run, Also
```kotlin
class MessageBuilder {
    fun buildMessage(userId: String, content: String): Message {
        return Message(
            id = UUID.randomUUID().toString(),
            senderId = userId,
            content = content,
            timestamp = LocalDateTime.now()
        ).apply {
            // Apply: configure the object
            isRead = false
            isPinned = false
        }.also {
            // Also: perform action and return
            println("Message created: ${it.id}")
        }
    }
    
    fun sendAndLog(message: Message) {
        message.let {
            // Let: scope the message
            sendMessage(it)
            logMessageSent(it)
            updateUIWithMessage(it)
        }
    }
    
    fun configureAndRun(chat: Chat) {
        chat.run {
            // Run: execute block in context of chat
            isActive = true
            participantCount++
            status = ChatStatus.ACTIVE
        }
    }
}
```

## Ktor Backend

### 1. Server Setup
```kotlin
fun Application.configureServer() {
    install(ContentNegotiation) {
        json()
    }
    
    install(WebSockets) {
        pingPeriod = Duration.ofSeconds(15)
        timeout = Duration.ofSeconds(15)
        maxFrameSize = Long.MAX_VALUE
        masking = false
    }
    
    install(Authentication) {
        jwt {
            realm = "chat-app"
            verifier(jwtVerifier)
            validate { credential ->
                JWTPrincipal(credential.payload)
            }
        }
    }
}

fun Application.configureRouting() {
    routing {
        post("/api/messages") {
            val message = call.receive<Message>()
            val saved = messageRepository.save(message)
            call.respond(HttpStatusCode.Created, saved)
        }
        
        webSocket("/ws/chat/{chatId}") {
            val chatId = call.parameters["chatId"]!!
            val user = call.principal<JWTPrincipal>()!!
            
            handleChatConnection(chatId, user)
        }
    }
}
```

### 2. WebSocket Handler
```kotlin
private suspend fun DefaultWebSocketServerSession.handleChatConnection(
    chatId: String,
    userPrincipal: JWTPrincipal
) {
    val userId = userPrincipal.getClaim("sub", String::class)!!
    chatManager.addConnection(chatId, userId, this)
    
    try {
        for (frame in incoming) {
            when (frame) {
                is Frame.Text -> {
                    val text = frame.readText()
                    val message = parseMessage(text)
                    chatManager.broadcastMessage(chatId, message)
                }
                is Frame.Close -> break
                else -> {}
            }
        }
    } finally {
        chatManager.removeConnection(chatId, userId)
    }
}
```

## Coroutines & Async

### 1. Repository Pattern
```kotlin
class MessageRepository(private val db: Database) {
    suspend fun saveMessage(message: Message): Message = withContext(Dispatchers.IO) {
        db.transaction {
            val entity = message.toEntity()
            messageDao.insert(entity)
            entity.toDomain()
        }
    }
    
    suspend fun getMessages(chatId: String): List<Message> = withContext(Dispatchers.IO) {
        messageDao.getMessagesByChatId(chatId).map { it.toDomain() }
    }
    
    suspend fun searchMessages(query: String): List<Message> = withContext(Dispatchers.Default) {
        messageDao.searchByContent(query)
            .map { it.toDomain() }
            .filter { it.content.contains(query, ignoreCase = true) }
    }
}
```

### 2. ViewModel with Coroutines
```kotlin
class ChatViewModel(
    private val chatRepository: ChatRepository,
    private val messageRepository: MessageRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()
    
    private val _messages = MutableStateFlow<List<Message>>(emptyList())
    val messages: StateFlow<List<Message>> = _messages.asStateFlow()
    
    fun loadMessages(chatId: String) {
        viewModelScope.launch {
            try {
                _uiState.value = UiState.Loading
                val messages = messageRepository.getMessages(chatId)
                _messages.value = messages
                _uiState.value = UiState.Success
            } catch (e: Exception) {
                _uiState.value = UiState.Error(e)
            }
        }
    }
    
    fun sendMessage(chatId: String, content: String) {
        viewModelScope.launch {
            try {
                val message = Message(
                    chatId = chatId,
                    content = content,
                    senderId = currentUserId,
                    timestamp = LocalDateTime.now()
                )
                messageRepository.saveMessage(message)
            } catch (e: Exception) {
                // Handle error
            }
        }
    }
}
```

## Android Compose UI

### 1. Chat Screen
```kotlin
@Composable
fun ChatScreen(
    chatId: String,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val uiState by viewModel.uiState.collectAsState()
    val messages by viewModel.messages.collectAsState()
    val scrollState = rememberLazyListState()
    
    LaunchedEffect(Unit) {
        viewModel.loadMessages(chatId)
    }
    
    Column(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            state = scrollState,
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            reverseLayout = true
        ) {
            items(messages, key = { it.id }) { message in
                MessageBubble(message)
            }
        }
        
        MessageInputField(
            onSendMessage = { content ->
                viewModel.sendMessage(chatId, content)
            }
        )
    }
}

@Composable
fun MessageBubble(message: Message) {
    Card(
        modifier = Modifier
            .fillMaxWidth(0.8f)
            .padding(8.dp),
        shape = RoundedCornerShape(8.dp),
        backgroundColor = if (message.isFromCurrentUser) Color.Blue else Color.Gray
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(message.content, color = Color.White)
            Text(
                message.timestamp.format(timeFormatter),
                fontSize = 12.sp,
                color = Color.LightGray
            )
        }
    }
}
```

## Testing

### 1. Repository Tests
```kotlin
class MessageRepositoryTest {
    private lateinit var repository: MessageRepository
    private lateinit var database: TestDatabase
    
    @Before
    fun setup() {
        database = TestDatabase.create()
        repository = MessageRepository(database)
    }
    
    @Test
    fun `test save and retrieve message`() = runTest {
        val message = Message(
            id = "1",
            content = "Test message",
            senderId = "user1",
            timestamp = LocalDateTime.now()
        )
        
        repository.saveMessage(message)
        val retrieved = repository.getMessages("chat1")
        
        assert(retrieved.isNotEmpty())
        assert(retrieved.first().content == "Test message")
    }
}
```

## Deliverables

1. Ktor backend with WebSocket support
2. Kotlin coroutine-based architecture
3. Extension function library
4. Sealed class domain models
5. Android Compose UI
6. Real-time messaging system
7. User authentication
8. Message persistence
9. Comprehensive test suite
10. Docker containerization
11. Performance monitoring
12. Complete documentation
