---
status: APPROVED
title: "Ruby Full-Stack Content Management System"
description: "Rails-based CMS with metaprogramming, DSLs, and dynamic content management"
author: "AMP"
created: "2024-01-12"
scope: "tests/lang/ruby/**"
---

# Ruby Full-Stack Implementation Plan

## Overview
Build a sophisticated content management system using Ruby on Rails with advanced metaprogramming, custom DSLs, blocks, procs, and lambdas for flexible content handling.

## Blocks, Procs & Lambdas

### 1. Block Usage
```ruby
class ContentProcessor
  def process_with_logging(&block)
    start_time = Time.now
    puts "Starting process..."
    
    result = block.call
    
    duration = Time.now - start_time
    puts "Completed in #{duration}s"
    result
  end
  
  def batch_process(items, &block)
    items.map { |item| block.call(item) }
  end
  
  def conditional_process(item, &block)
    if item.valid?
      block.call(item)
    else
      handle_invalid(item)
    end
  end
end

processor = ContentProcessor.new
processor.process_with_logging do
  Article.all.update_all(status: :published)
end
```

### 2. Procs vs Lambdas
```ruby
class WorkflowEngine
  # Proc is more flexible
  def create_workflow_with_proc(&workflow)
    proc_workflow = Proc.new(&workflow)
    
    # Can be called in different contexts
    execute_in_background(proc_workflow)
  end
  
  # Lambda is strict
  def create_validator(validator_lambda)
    lambda do |content|
      validator_lambda.call(content)
    end
  end
  
  def register_hooks
    # Using yield for simple callbacks
    hooks = []
    
    hooks << lambda { |content| content.upcase }
    hooks << lambda { |content| content.strip }
    
    hooks.each { |hook| hook.call("  hello  ") }
  end
end
```

### 3. Advanced Block Patterns
```ruby
class Collection
  attr_accessor :items
  
  def initialize(items = [])
    @items = items
  end
  
  # Map with index
  def each_with_details(&block)
    @items.each_with_index do |item, index|
      block.call(item, index, @items.length)
    end
  end
  
  # Partition based on condition
  def partition_by(&block)
    @items.partition { |item| block.call(item) }
  end
  
  # Lazy evaluation
  def lazy_map(&block)
    @items.lazy.map(&block)
  end
  
  # Reduce/fold pattern
  def accumulate(initial = nil, &block)
    @items.reduce(initial) { |acc, item| block.call(acc, item) }
  end
end

collection = Collection.new([1, 2, 3, 4, 5])
even, odd = collection.partition_by { |n| n.even? }
```

## Metaprogramming & DSLs

### 1. Custom DSL for Content Definition
```ruby
module ContentBuilder
  def self.define_content(&block)
    builder = ContentDefinition.new
    builder.instance_eval(&block)
    builder.build
  end
end

class ContentDefinition
  attr_accessor :name, :fields, :validations, :hooks
  
  def initialize
    @fields = []
    @validations = {}
    @hooks = { before_save: [], after_save: [] }
  end
  
  def field(name, type = :string, **options)
    @fields << { name: name, type: type, **options }
  end
  
  def validate(field_name, &block)
    @validations[field_name] ||= []
    @validations[field_name] << block
  end
  
  def before_save(&block)
    @hooks[:before_save] << block
  end
  
  def after_save(&block)
    @hooks[:after_save] << block
  end
  
  def build
    ContentType.new(name: @name, fields: @fields, validations: @validations, hooks: @hooks)
  end
end

# Usage
ArticleType = ContentBuilder.define_content do
  field :title, :string, required: true, max_length: 200
  field :body, :text, required: true
  field :published_at, :datetime
  
  validate :title do |value|
    value.length >= 5
  end
  
  before_save { |content| content.slug = content.title.downcase.gsub(' ', '-') }
  after_save { |content| notify_subscribers(content) }
end
```

### 2. Dynamic Method Generation
```ruby
class ActiveContent
  def self.has_many(association_name, **options)
    # Dynamically generate getter
    define_method(association_name) do
      instance_variable_get("@#{association_name}") || []
    end
    
    # Dynamically generate add method
    define_method("add_#{association_name.to_s.singularize}") do |item|
      collection = instance_variable_get("@#{association_name}") || []
      collection << item
      instance_variable_set("@#{association_name}", collection)
    end
    
    # Dynamically generate count method
    define_method("#{association_name}_count") do
      send(association_name).length
    end
  end
  
  def self.attr_timestamp(name)
    attr_accessor name
    
    define_method("#{name}_formatted") do
      send(name)&.strftime("%B %d, %Y")
    end
  end
end

class Article < ActiveContent
  has_many :comments
  attr_timestamp :published_at
  
  def initialize(title)
    @title = title
  end
end

article = Article.new("Hello World")
article.add_comment(Comment.new("Great post!"))
puts article.comments_count
```

## Rails Conventions & Patterns

### 1. Model with Callbacks & Scopes
```ruby
class Article < ApplicationRecord
  has_many :comments, dependent: :destroy
  has_many :tags, through: :article_tags
  belongs_to :author, class_name: 'User'
  
  # Validations
  validates :title, presence: true, uniqueness: true, length: { minimum: 5, maximum: 200 }
  validates :body, presence: true, length: { minimum: 100 }
  validates :author, presence: true
  
  # Callbacks
  before_save :generate_slug
  before_save :sanitize_html
  after_save :trigger_webhooks
  before_destroy :cleanup_media
  
  # Scopes
  scope :published, -> { where(status: :published).where("published_at <= ?", Time.current) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_author, ->(author_id) { where(author_id: author_id) }
  scope :trending, -> { published.where("views > ?", 1000).recent }
  
  enum status: { draft: 0, published: 1, archived: 2 }
  
  # Instance methods
  def publish!
    update(status: :published, published_at: Time.current)
  end
  
  def word_count
    body.split.length
  end
  
  def preview
    body.truncate(200)
  end
  
  private
  
  def generate_slug
    self.slug = title.downcase.gsub(/[^\w\s-]/, '').gsub(/\s+/, '-')
  end
  
  def sanitize_html
    self.body = Sanitize.fragment(body)
  end
  
  def trigger_webhooks
    WebhookService.trigger(:article_updated, self)
  end
end
```

### 2. Controller with RESTful Actions
```ruby
class ArticlesController < ApplicationController
  before_action :authenticate_user!, except: [:index, :show]
  before_action :set_article, only: [:show, :edit, :update, :destroy]
  
  def index
    @articles = Article.published.recent.page(params[:page])
  end
  
  def show
    @comments = @article.comments.recent
    @article.increment(:views).save
  end
  
  def new
    @article = current_user.articles.build
  end
  
  def create
    @article = current_user.articles.build(article_params)
    
    if @article.save
      redirect_to @article, notice: 'Article created successfully'
    else
      render :new, status: :unprocessable_entity
    end
  end
  
  def edit
  end
  
  def update
    if @article.update(article_params)
      redirect_to @article, notice: 'Article updated'
    else
      render :edit, status: :unprocessable_entity
    end
  end
  
  def destroy
    @article.destroy
    redirect_to articles_url, notice: 'Article deleted'
  end
  
  private
  
  def set_article
    @article = Article.find_by!(slug: params[:id])
  end
  
  def article_params
    params.require(:article).permit(:title, :body, :status, tag_ids: [])
  end
end
```

## Enumerator & Iterator Patterns

### 1. Custom Iterators
```ruby
class ContentStream
  def initialize(items)
    @items = items
  end
  
  def each
    return enum_for(:each) unless block_given?
    
    @items.each { |item| yield item }
  end
  
  def each_with_filter
    return enum_for(:each_with_filter) unless block_given?
    
    @items.each do |item|
      yield item if item.valid?
    end
  end
  
  def batched(size)
    return enum_for(:batched, size) unless block_given?
    
    @items.each_slice(size) { |batch| yield batch }
  end
  
  include Enumerable
end

stream = ContentStream.new(articles)
stream.each { |article| process(article) }
stream.batched(10) { |batch| import_batch(batch) }
```

## Testing with Blocks

### 1. RSpec Examples
```ruby
describe Article do
  describe '#publish!' do
    let(:article) { create(:article, status: :draft) }
    
    it 'changes status to published' do
      expect { article.publish! }
        .to change { article.status }
        .from('draft')
        .to('published')
    end
    
    it 'sets published_at timestamp' do
      article.publish!
      expect(article.published_at).to be_within(1.second).of(Time.current)
    end
  end
  
  describe '.published' do
    it 'returns only published articles' do
      published = create(:article, status: :published)
      draft = create(:article, status: :draft)
      
      result = Article.published
      
      expect(result).to include(published)
      expect(result).not_to include(draft)
    end
  end
end

describe 'Article creation workflow' do
  it 'goes through full lifecycle' do
    expect {
      article = create(:article)
    }.to change(Article, :count).by(1)
  end
end
```

## Deliverables

1. Rails application with full CRUD
2. Custom DSL for content definitions
3. Dynamic method generation
4. Advanced callback system
5. Scope-based query DSL
6. Block/proc/lambda patterns
7. Metaprogramming helpers
8. RESTful API
9. Admin dashboard
10. Comprehensive test suite
11. Docker containerization
12. Documentation and guides
