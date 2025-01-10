import mongoose, { isValidObjectId } from "mongoose";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";
import { asyncHandler } from "../utils/asyncHandler";
import { User } from "../models/user.model";
import { Subscription } from "../models/subscription.model.js";

const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel id");
  }
  const subscribed = await Subscription.findOne({
    $and: [{ channel: channelId }, { subscriber: req.user._id }],
  });
  if (!subscribed) {
    const subscribe = await Subscription.create({
      subscriber: req.user._id,
      channel: channelId,
    });
    if (!subscribe) {
      throw new ApiError(400, "Error while subscribing to the channel");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, subscribe, "channel Subscribed"));
  }

  const unsubscribe = await Subscription.findByIdAndDelete(subscribed._id);
  if (!unsubscribe) {
    throw new ApiError(500, "Error while unsubscribing");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Channel unsubcribied successfully"));
});

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params;
  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "invalid object id");
  }

  const channelSubscribers = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber",
        pipeline: [
          {
            $project: {
              username: 1,
              fullName: 1,
              avatar: 1,
            },
          },
        ],
      },
    },

    {
      $addFields: {
        subscriber: {
          $first: "$subscriber",
        },
      },
    },

    {
      $project: {
        subscriber: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, channelSubscribers, "fetched subscriber list"));
});

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;
  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "invalid subscriberId");
  }

  const subscribedChannels = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId),
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel",
        pipeline: [
          {
            $project: {
              fullName: 1,
              username: 1,
              avatar: 1,
            },
          },
        ],
      },
    },
    {
      $addFields: {
        channel: {
          $first: "$channel",
        },
      },
    },
    {
      $project: {
        channel: 1,
        createdAt: 1,
      },
    },
  ]);
  if (!subscribedChannels) {
    throw new ApiError(400, "Error fetching subscribed channels");
  }
  return res
    .status(200)
    .json(200, subscribedChannels, "Subscribed channels fetched ");
});

export { toggleSubscription, getUserChannelSubscribers, getSubscribedChannels };
