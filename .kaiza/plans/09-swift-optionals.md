---
status: APPROVED
title: "Swift Full-Stack iOS Photography App"
description: "Complete iOS application with Core Data, CloudKit, and machine learning image recognition"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/swift/**"
---

# Swift Full-Stack Implementation Plan

## Overview
Build a comprehensive iOS photography app with advanced features including image recognition, cloud sync, local gallery management, and social sharing capabilities using Swift and modern iOS frameworks.

## Architecture

### iOS App (Swift)
- SwiftUI for modern UI
- MVVM architecture pattern
- Core Data for local persistence
- CloudKit for cloud synchronization
- Vision framework for ML image recognition

### Backend (Swift Server)
- Vapor web framework
- PostgreSQL database
- RESTful API design
- WebSocket for real-time updates
- JWT authentication

## Optional Type Usage

### 1. Core Models with Optionals
```swift
class Photo {
    let id: UUID
    let url: URL
    var title: String?
    var description: String?
    var location: CLLocationCoordinate2D?
    var tags: [String] = []
    var recognizedObjects: [RecognizedObject] = []
    
    init(url: URL) {
        self.id = UUID()
        self.url = url
    }
}

struct Album {
    let id: UUID
    let name: String
    var cover: Photo?
    let photos: [Photo]
    var description: String?
    var isPrivate: Bool = false
}

struct User {
    let id: UUID
    let username: String
    var profilePicture: Photo?
    var bio: String?
    var website: URL?
    var followers: [User] = []
    var following: [User] = []
}
```

### 2. Optional Unwrapping Patterns
```swift
// Guard let pattern
func displayPhotoDetails(photo: Photo?) {
    guard let photo = photo else {
        showPlaceholder()
        return
    }
    
    updateUI(with: photo)
    
    if let location = photo.location {
        displayMap(at: location)
    }
    
    if let description = photo.description, !description.isEmpty {
        descriptionLabel.text = description
    }
}

// If let chaining
func sharePhoto(photo: Photo?) {
    if let photo = photo,
       let title = photo.title,
       let url = photo.url {
        ShareSheet.present(title: title, url: url)
    }
}

// Optional coalescing
func getPhotoTitle(_ photo: Photo?) -> String {
    return photo?.title ?? "Untitled Photo"
}

// Optional binding with type cast
func processItem(_ item: Any?) {
    if let photo = item as? Photo {
        processPhoto(photo)
    } else if let album = item as? Album {
        processAlbum(album)
    }
}
```

## Error Handling

### 1. Do-Try-Catch
```swift
enum PhotoError: Error {
    case failedToLoad
    case invalidFormat
    case processingFailed
    case uploadFailed(String)
}

func loadPhoto(from url: URL) throws -> UIImage {
    let data = try Data(contentsOf: url)
    guard let image = UIImage(data: data) else {
        throw PhotoError.invalidFormat
    }
    return image
}

func uploadPhoto(_ photo: Photo) {
    do {
        let encoded = try JSONEncoder().encode(photo)
        try apiClient.upload(encoded)
        showSuccessMessage()
    } catch PhotoError.processingFailed {
        showError("Failed to process photo")
    } catch let error as URLError {
        showError("Network error: \(error.localizedDescription)")
    } catch {
        showError("Unknown error occurred")
    }
}
```

## MVVM & Binding

### 1. View Models
```swift
@MainActor
class PhotosViewModel: ObservableObject {
    @Published var photos: [Photo] = []
    @Published var isLoading = false
    @Published var error: Error?
    @Published var selectedPhoto: Photo?
    
    private let photoService: PhotoService
    
    init(photoService: PhotoService = .shared) {
        self.photoService = photoService
    }
    
    func loadPhotos() {
        isLoading = true
        
        Task {
            do {
                photos = try await photoService.fetchPhotos()
                isLoading = false
            } catch {
                self.error = error
                isLoading = false
            }
        }
    }
    
    func deletePhoto(_ photo: Photo) async throws {
        try await photoService.delete(photo)
        photos.removeAll { $0.id == photo.id }
    }
}
```

### 2. SwiftUI Views
```swift
struct PhotoListView: View {
    @StateObject private var viewModel = PhotosViewModel()
    @State private var showingNewPhotoSheet = false
    
    var body: some View {
        NavigationStack {
            List {
                ForEach(viewModel.photos, id: \.id) { photo in
                    NavigationLink(value: photo) {
                        PhotoRowView(photo: photo)
                    }
                }
                .onDelete(perform: deletePhotos)
            }
            .navigationTitle("My Photos")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button(action: { showingNewPhotoSheet = true }) {
                        Label("Add", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingNewPhotoSheet) {
                NewPhotoView()
            }
            .navigationDestination(for: Photo.self) { photo in
                PhotoDetailView(photo: photo)
            }
            .task {
                await viewModel.loadPhotos()
            }
        }
    }
    
    private func deletePhotos(offsets: IndexSet) {
        Task {
            for index in offsets {
                let photo = viewModel.photos[index]
                try? await viewModel.deletePhoto(photo)
            }
        }
    }
}
```

## Core Data Integration

### 1. Model Setup
```swift
@Model
final class PhotoEntity {
    @Attribute(.unique) var id: UUID
    var title: String?
    var description: String?
    var imageData: Data
    var createdDate: Date
    var modifiedDate: Date
    
    @Relationship(deleteRule: .cascade) var tags: [TagEntity] = []
    var albumID: UUID?
    
    init(id: UUID = UUID(), title: String?, imageData: Data) {
        self.id = id
        self.title = title
        self.imageData = imageData
        self.createdDate = Date()
        self.modifiedDate = Date()
    }
}

@Model
final class TagEntity {
    @Attribute(.unique) var name: String
    var photos: [PhotoEntity] = []
    
    init(name: String) {
        self.name = name
    }
}
```

### 2. Data Access
```swift
@MainActor
class PhotoRepository {
    @Environment(\.modelContext) var modelContext
    
    func savePhoto(_ photo: Photo, imageData: Data) throws {
        let entity = PhotoEntity(
            id: photo.id,
            title: photo.title,
            imageData: imageData
        )
        modelContext.insert(entity)
        try modelContext.save()
    }
    
    func fetchPhotos() throws -> [Photo] {
        var descriptor = FetchDescriptor<PhotoEntity>()
        descriptor.sortBy = [SortDescriptor(\.createdDate, order: .reverse)]
        return try modelContext.fetch(descriptor).map { $0.toDomain() }
    }
}
```

## Vision Framework & ML

### 1. Image Recognition
```swift
class ImageRecognizer {
    private let model: VNCoreMLModel?
    
    init() {
        guard let mlModel = try? MobileNetV2(configuration: .init()).model else {
            self.model = nil
            return
        }
        self.model = try? VNCoreMLModel(for: mlModel)
    }
    
    func recognizeObjects(in image: UIImage) async throws -> [RecognizedObject] {
        guard let cgImage = image.cgImage else {
            throw PhotoError.invalidFormat
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            let request = VNCoreMLRequest(model: self.model!) { request, error in
                if let error = error {
                    continuation.resume(throwing: error)
                    return
                }
                
                guard let results = request.results as? [VNClassificationObservation] else {
                    continuation.resume(returning: [])
                    return
                }
                
                let objects = results.map { observation in
                    RecognizedObject(
                        label: observation.identifier,
                        confidence: observation.confidence
                    )
                }
                continuation.resume(returning: objects)
            }
            
            let handler = VNImageRequestHandler(cgImage: cgImage)
            try? handler.perform([request])
        }
    }
}
```

## CloudKit Sync

### 1. CloudKit Operations
```swift
@MainActor
class CloudSyncManager: NSObject, CKSyncEngine.Delegate {
    let container: CKContainer
    
    override init() {
        container = CKContainer.default()
    }
    
    func uploadPhoto(_ photo: Photo, imageData: Data) async throws {
        let record = CKRecord(recordType: "Photo")
        record["title"] = photo.title
        record["description"] = photo.description
        
        if let assetPath = try? saveTempImage(imageData) {
            record["image"] = CKAsset(fileURL: assetPath)
        }
        
        try await container.privateCloudDatabase.save(record)
    }
    
    func fetchAllPhotos() async throws -> [Photo] {
        let predicate = NSPredicate(value: true)
        let query = CKQuery(recordType: "Photo", predicate: predicate)
        
        let records = try await container.privateCloudDatabase.records(matching: query)
        return records.matchResults.compactMap { result in
            guard let record = try? result.1.get() else { return nil }
            return Photo(from: record)
        }
    }
}
```

## Async/Await

### 1. Async Functions
```swift
actor PhotoService {
    func fetchPhoto(id: UUID) async throws -> Photo {
        let url = URL(string: "https://api.example.com/photos/\(id)")!
        let (data, _) = try await URLSession.shared.data(from: url)
        return try JSONDecoder().decode(Photo.self, from: data)
    }
    
    func processPhotos(_ photos: [Photo]) async -> [ProcessedPhoto] {
        return await withTaskGroup(of: ProcessedPhoto?.self) { group in
            for photo in photos {
                group.addTask {
                    try? await processPhoto(photo)
                }
            }
            
            var results: [ProcessedPhoto] = []
            for await result in group {
                if let processed = result {
                    results.append(processed)
                }
            }
            return results
        }
    }
}
```

## Deliverables

1. iOS app with SwiftUI UI
2. MVVM architecture implementation
3. Core Data persistence layer
4. CloudKit synchronization
5. Vision framework image recognition
6. Vapor backend API
7. WebSocket real-time features
8. Authentication system
9. Comprehensive test suite
10. Unit and UI tests
11. App Store submission ready
12. Complete documentation
