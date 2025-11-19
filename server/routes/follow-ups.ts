import { RequestHandler } from "express";
import axios from 'axios';

// Update follow-up meeting status
export const updateFollowUpStatus: RequestHandler = async (req, res) => {
  try {
    const { status, meetingDetails } = req.body;
    // Allow followUpId to be passed either as URL param or in the body
    const followUpId = (req.params && (req.params as any).id) || (req.body && req.body.followUpId);

    if (!followUpId || !status) {
      return res.status(400).json({
        error: "Missing required fields: followUpId and status are required",
      });
    }

    console.log("Updating follow-up status:", {
      followUpId,
      status,
      meetingDetails,
    });

    // Construct the external API URL for updating follow-up status
    const externalApiUrl = process.env.VITE_EXTERNAL_LEAD_API || "https://jbdspower.in/LeafNetServer/api";
    const baseUrl = externalApiUrl.replace("/getAllLead", "");
    
    // Prefer external endpoint updateFollowUp/:id if available
    const updateUrl = `${baseUrl}/updateFollowUp/${followUpId}`;

    const updatePayload = {
      meetingStatus: status,
      meetingDetails: meetingDetails,
      updatedAt: new Date().toISOString(),
    };

    console.log("Sending update to external API (updateFollowUp/:id):", {
      url: updateUrl,
      payload: updatePayload,
    });

    // Try calling the updateFollowUp/:id endpoint first
    let response;
    try {
      response = await axios.put(updateUrl, updatePayload, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      });
    } catch (err) {
      console.warn("updateFollowUp/:id failed, falling back to updateFollowUpHistory", err?.message || err);
      // Fallback to older endpoint if available
      const fallbackUrl = `${baseUrl}/updateFollowUpHistory`;
      const fallbackPayload = {
        id: followUpId,
        status: status,
        meetingDetails: meetingDetails,
        updatedAt: new Date().toISOString(),
      };
      console.log("Sending update to external API (fallback):", { url: fallbackUrl, payload: fallbackPayload });
      response = await axios.put(fallbackUrl, fallbackPayload, {
        headers: { "Content-Type": "application/json" },
        timeout: 10000,
      });
    }

    if (response.status === 200 || response.data.success) {
      console.log("Follow-up status updated successfully:", response.data);
      return res.json({
        message: "Follow-up status updated successfully",
        data: response.data,
      });
    } else {
      console.error("Failed to update follow-up status:", response.data);
      return res.status(400).json({
        error: "Failed to update follow-up status",
        details: response.data,
      });
    }
  } catch (error) {
    console.error("Error updating follow-up status:", error);

    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || error.message;
      return res.status(error.response?.status || 500).json({
        error: "Failed to update follow-up status",
        details: errorMessage,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Get follow-up history for a user
export const getFollowUpHistory: RequestHandler = async (req, res) => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({
        error: "Missing required parameter: userId",
      });
    }

    console.log("Fetching follow-up history for user:", userId);

    const externalApiUrl = process.env.VITE_EXTERNAL_LEAD_API || "https://jbdspower.in/LeafNetServer/api";
    const baseUrl = externalApiUrl.replace("/getAllLead", "");
    const url = `${baseUrl}/getFollowUpHistory?userId=${userId}`;

    console.log("Fetching from external API:", url);

    const response = await axios.get(url, {
      timeout: 10000,
    });

    if (response.status === 200 && response.data) {
      console.log(`Fetched ${response.data.length || 0} follow-up records`);
      return res.json(response.data);
    } else {
      console.error("Failed to fetch follow-up history:", response.data);
      return res.status(400).json({
        error: "Failed to fetch follow-up history",
        details: response.data,
      });
    }
  } catch (error) {
    console.error("Error fetching follow-up history:", error);

    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || error.message;
      return res.status(error.response?.status || 500).json({
        error: "Failed to fetch follow-up history",
        details: errorMessage,
      });
    }

    return res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
