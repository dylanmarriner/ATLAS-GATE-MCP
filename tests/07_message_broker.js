/**
 * ROLE: EXECUTABLE
 * CONNECTED VIA: Channel-based concurrency patterns
 * PURPOSE: Concurrent message broker with topic partitioning and consumer groups
 * FAILURE MODES: Duplicate topics throw error, missing topics throw error, invalid consumer groups throw error
 *
 * Authority: 07-go-concurrency.md
 */

// Plan 07: Go Concurrency - Message Broker Implementation
class Topic {
  constructor(topicName) {
    this.name = topicName;
    this.partitions = new Map();
    this.subscribers = [];
    this.messageCount = 0;
  }
  
  getOrCreatePartition(partitionId) {
    if (!this.partitions.has(partitionId)) {
      this.partitions.set(partitionId, {
        id: partitionId,
        messages: [],
        offset: 0
      });
    }
    return this.partitions.get(partitionId);
  }
  
  publish(partitionId, messageContent) {
    if (!messageContent) {
      throw new Error('Message content required');
    }
    
    const partition = this.getOrCreatePartition(partitionId);
    const message = {
      id: Math.random().toString(36).substr(2, 9),
      content: messageContent,
      timestamp: new Date(),
      offset: partition.offset++
    };
    
    partition.messages.push(message);
    this.messageCount++;
    
    this.notifySubscribers(message);
    return message;
  }
  
  subscribe(subscriberId) {
    if (!this.subscribers.includes(subscriberId)) {
      this.subscribers.push(subscriberId);
    }
  }
  
  notifySubscribers(message) {
    for (const subscriberId of this.subscribers) {
      const notification = {
        subscriber: subscriberId,
        message: message.id,
        timestamp: new Date()
      };
    }
  }
}

class ConsumerGroup {
  constructor(groupId, topicName) {
    this.groupId = groupId;
    this.topicName = topicName;
    this.consumers = [];
    this.offsets = new Map();
    this.lastProcessed = null;
  }
  
  addConsumer(consumerId) {
    if (!this.consumers.includes(consumerId)) {
      this.consumers.push(consumerId);
    }
  }
  
  recordOffset(partitionId, offset) {
    this.offsets.set(partitionId, offset);
    this.lastProcessed = new Date();
  }
  
  getOffset(partitionId) {
    return this.offsets.get(partitionId) || 0;
  }
}

class MessageBroker {
  constructor(brokerId) {
    this.brokerId = brokerId;
    this.topics = new Map();
    this.consumerGroups = new Map();
    this.isRunning = false;
  }
  
  createTopic(topicName) {
    if (this.topics.has(topicName)) {
      throw new Error('Topic already exists');
    }
    const topic = new Topic(topicName);
    this.topics.set(topicName, topic);
    return topic;
  }
  
  getTopic(topicName) {
    if (!this.topics.has(topicName)) {
      throw new Error('Topic not found');
    }
    return this.topics.get(topicName);
  }
  
  publishMessage(topicName, partitionId, message) {
    const topic = this.getTopic(topicName);
    return topic.publish(partitionId, message);
  }
  
  createConsumerGroup(groupId, topicName) {
    const key = `${groupId}:${topicName}`;
    if (this.consumerGroups.has(key)) {
      throw new Error('Consumer group already exists');
    }
    const group = new ConsumerGroup(groupId, topicName);
    this.consumerGroups.set(key, group);
    return group;
  }
  
  getConsumerGroup(groupId, topicName) {
    const key = `${groupId}:${topicName}`;
    if (!this.consumerGroups.has(key)) {
      throw new Error('Consumer group not found');
    }
    return this.consumerGroups.get(key);
  }
  
  start() {
    this.isRunning = true;
    return this.isRunning;
  }
  
  stop() {
    this.isRunning = false;
    return !this.isRunning;
  }
  
  getMetrics() {
    const topicsArray = Array.from(this.topics.values());
    return {
      brokerId: this.brokerId,
      isRunning: this.isRunning,
      topicCount: this.topics.size,
      consumerGroupCount: this.consumerGroups.size,
      totalMessages: topicsArray.reduce((sum, t) => sum + t.messageCount, 0)
    };
  }
}

const broker = new MessageBroker('BROKER-001');
broker.start();

const eventsTopic = broker.createTopic('user-events');
const loggingGroup = broker.createConsumerGroup('logging-service', 'user-events');
loggingGroup.addConsumer('logger-1');
loggingGroup.addConsumer('logger-2');

const msg1 = broker.publishMessage('user-events', 0, '{ "event": "user.created", "userId": "U123" }');
const msg2 = broker.publishMessage('user-events', 0, '{ "event": "user.login", "userId": "U123" }');
const msg3 = broker.publishMessage('user-events', 1, '{ "event": "user.created", "userId": "U456" }');

module.exports = { Topic, ConsumerGroup, MessageBroker, broker };
