import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const createTweet = asyncHandler(async (req, res) => {
  //step-1 content is must so get the content from req.body
  //step-2 validate the content , check if it is empty or not
  //step-3 get user from access token
  //step-4 create a new tweet from models and save it
  //step-5 send the tweet response

  try {
    const { content } = req.body;
    if (!content) {
      throw new ApiError(400, "Content is empty.");
    }

    const tweet = await Tweet.create({
      content,
      owner: req.user._id,
    });

    if (!tweet) {
      throw new ApiError(400, "Error while creating a tweet and saved");
    }
    return res
      .status(200)
      .json(new ApiResponse(200, tweet, "Tweet is created successfully"));
  } catch (error) {
    throw new ApiError(400, error.message || "Error while creating a tweet");
  }
});

const getUserTweets = asyncHandler(async (req, res) => {
  try {
    // Step 1: Get the user ID from the URL
    const userId = req.params.userId; // Use userId

    // Step 2: Check if the user ID is valid
    if (!isValidObjectId(userId)) {
      throw new ApiError(400, "User ID is not valid");
    }

    // Step 3: Get the user from the database
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(400, "User not found");
    }

    // Step 4: Get all tweets for the user
    const tweets = await Tweet.find({ owner: userId }).sort({ createdAt: -1 });
    if (!tweets.length) {
      throw new ApiError(400, "No tweets found for this user");
    }

    // Return the tweets
    res
      .status(200)
      .json(new ApiResponse(200, tweets, "Tweets fetched successfully"));
  } catch (error) {
    // Handle errors and provide the error message if available
    throw new ApiError(
      400,
      error.message || "Error while getting the tweets of the user"
    );
  }
});

const updateTweet = asyncHandler(async (req, res) => {
  try {
    const { content } = req.body;
    if (!content) {
      throw new ApiError(400, "Content is missing");
    }

    const tweetId = req.params.tweetId;

    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
      throw new ApiError(400, "Invalid TweetId");
    }

    const owner = req.user._id;
    if (!tweet?.owner.equals(owner)) {
      throw new ApiError(400, "You are not allowed to update this tweet");
    }

    const modifiedtweet = await Tweet.findByIdAndUpdate(
      tweetId,
      {
        $set: {
          content,
        },
      },
      {
        new: true,
      }
    );

    return res
      .status(200)
      .json(200, modifiedtweet, "tweet updated successfully");
  } catch (error) {
    throw new ApiError(400, "Error while updating the tweet");
  }
});

const deleteTweet = asyncHandler(async (req, res) => {
  const tweetId = req.params.tweetId;
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Tweet ID is invalid");
  }

  const tweet = await Tweet.findById(tweetId);
  if (!tweet) {
    throw new ApiError(400, "tweet not found");
  }
  const owner = req.user._id;

  if (!tweet?.owner.equals(owner)) {
    throw new ApiError(400, "You are not allowed to delete this tweet");
  }

  const response = await Tweet.findByIdAndDelete(tweetId);
  if (!response) {
    throw new ApiError(400, "Error while deleting the tweet");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "tweet deleted successfully"));
});

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet
}
