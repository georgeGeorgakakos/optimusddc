"""
OptimusDB Chat Backend - Simple Example
Connects to your OptimusDB and provides chat responses
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="OptimusDB Chat API", version="1.0.0")

# CORS Configuration - Update with your frontend URL in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to ["http://localhost:3000"] in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data Models
class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    message: str
    conversation_history: List[Message] = []
    language: str = "en-US"
    user_id: Optional[str] = None

class Dataset(BaseModel):
    name: str
    description: str
    database: str
    schema: str
    cluster: str

class ChatResponse(BaseModel):
    response: str
    datasets: List[Dataset] = []
    suggestions: List[str] = []
    metadata: Dict[str, Any] = {}

# Mock Data - Replace with your OptimusDB queries
MOCK_DATASETS = [
    {
        "name": "customer_dim",
        "description": "Customer dimension table with demographic information",
        "database": "analytics",
        "schema": "dim",
        "cluster": "production"
    },
    {
        "name": "sales_fact",
        "description": "Sales transactions fact table",
        "database": "analytics",
        "schema": "fact",
        "cluster": "production"
    },
    {
        "name": "user_behavior",
        "description": "User clickstream and behavior events",
        "database": "analytics",
        "schema": "raw",
        "cluster": "production"
    }
]

# Simple keyword matching - Replace with your actual search logic
def search_datasets(query: str) -> List[Dict]:
    """Search for datasets based on query keywords"""
    query_lower = query.lower()
    keywords = query_lower.split()

    results = []
    for dataset in MOCK_DATASETS:
        # Check if any keyword matches dataset name or description
        if any(keyword in dataset["name"].lower() or
               keyword in dataset["description"].lower()
               for keyword in keywords):
            results.append(dataset)

    return results

def generate_response(message: str, datasets: List[Dict]) -> str:
    """Generate natural language response"""
    message_lower = message.lower()

    # Greetings
    if any(word in message_lower for word in ['hi', 'hello', 'hey']):
        return "Hello! I'm your data catalog assistant. I can help you find datasets, understand their schemas, and discover data in OptimusDB. What would you like to know?"

    # Dataset search
    if any(word in message_lower for word in ['find', 'search', 'show', 'list']):
        if datasets:
            dataset_names = [d["name"] for d in datasets]
            return f"I found {len(datasets)} dataset(s) that match your query: {', '.join(dataset_names)}. Would you like more details about any of these?"
        else:
            return "I couldn't find any datasets matching your query. Try searching for 'customer', 'sales', or 'user' data."

    # Help
    if any(word in message_lower for word in ['help', 'what can you do']):
        return "I can help you with:\n• Finding datasets by name or description\n• Understanding table schemas\n• Discovering data owners\n• Viewing data lineage\n• Checking data quality\n\nTry asking 'Show me customer tables' or 'What's in the sales database?'"

    # Default response
    if datasets:
        return f"I found some relevant datasets: {', '.join([d['name'] for d in datasets])}. Let me know if you'd like more information!"
    else:
        return "I'm here to help you explore the data catalog. Try asking about specific datasets, databases, or data topics you're interested in."

def generate_suggestions(message: str, datasets: List[Dict]) -> List[str]:
    """Generate follow-up suggestions"""
    suggestions = []

    if datasets:
        # Add specific suggestions based on found datasets
        if len(datasets) > 0:
            suggestions.append(f"Tell me more about {datasets[0]['name']}")
        if any('customer' in d['name'].lower() for d in datasets):
            suggestions.append("Show me customer data lineage")
        if any('sales' in d['name'].lower() for d in datasets):
            suggestions.append("Who owns the sales tables?")
    else:
        # Generic suggestions
        suggestions = [
            "Show me tables in the analytics database",
            "Find datasets owned by the data team",
            "What are the most popular tables?"
        ]

    return suggestions[:3]  # Return max 3 suggestions

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "OptimusDB Chat API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "optimusdb-chat"
    }

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint

    Processes user messages and returns AI-generated responses
    with relevant datasets and suggestions
    """
    try:
        logger.info(f"Received message: {request.message[:100]}...")

        # Search for relevant datasets
        # TODO: Replace with actual OptimusDB query
        datasets = search_datasets(request.message)

        # Generate response
        response_text = generate_response(request.message, datasets)

        # Generate follow-up suggestions
        suggestions = generate_suggestions(request.message, datasets)

        # Build response
        response = ChatResponse(
            response=response_text,
            datasets=[Dataset(**d) for d in datasets],
            suggestions=suggestions,
            metadata={
                "language": request.language,
                "datasets_found": len(datasets)
            }
        )

        logger.info(f"Generated response with {len(datasets)} datasets")
        return response

    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/datasets")
async def list_datasets():
    """List all available datasets"""
    return {
        "datasets": MOCK_DATASETS,
        "total": len(MOCK_DATASETS)
    }

@app.get("/datasets/{name}")
async def get_dataset(name: str):
    """Get details for a specific dataset"""
    dataset = next((d for d in MOCK_DATASETS if d["name"] == name), None)
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    return dataset

@app.post("/datasets/search")
async def search_datasets_endpoint(query: str):
    """Search for datasets"""
    results = search_datasets(query)
    return {
        "query": query,
        "results": results,
        "total": len(results)
    }

if __name__ == "__main__":
    import uvicorn

    logger.info("Starting OptimusDB Chat API...")
    logger.info("API Documentation: http://localhost:5002/docs")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=5002,
        log_level="info"
    )